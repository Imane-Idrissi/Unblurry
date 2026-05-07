import { ReportRepository } from '../database/report-repository';
import { SessionRepository } from '../database/session-repository';
import { CaptureRepository } from '../database/capture-repository';
import { FeelingRepository } from '../database/feeling-repository';
import { SessionEventsRepository } from '../database/session-events-repository';
import { AiService, AiServiceError, collapseCaptures, buildReportPrompt, parseReportResponse } from './ai-service';
import type { ReportGetResponse, Session, SessionEvent } from '../../shared/types';
import { calculateActiveMinutes } from '../../shared/session-time';

export class ReportService {
  constructor(
    private reportRepo: ReportRepository,
    private sessionRepo: SessionRepository,
    private captureRepo: CaptureRepository,
    private feelingRepo: FeelingRepository,
    private eventsRepo: SessionEventsRepository,
    private getAiService: () => AiService | null,
  ) {}

  startGeneration(sessionId: string): void {
    const existing = this.reportRepo.getBySessionId(sessionId);
    if (existing && existing.status === 'ready') return;

    let report = existing;
    if (!report || report.status === 'failed' || report.status === 'quota_exhausted') {
      report = this.reportRepo.create(sessionId);
    }

    this.generateInBackground(sessionId, report.report_id);
  }

  getReport(sessionId: string): ReportGetResponse {
    const report = this.reportRepo.getBySessionId(sessionId);
    if (!report) {
      return { status: 'generating' };
    }

    if (report.status === 'generating') {
      return { status: 'generating' };
    }

    const session = this.sessionRepo.getById(sessionId);

    if (report.status === 'failed' || report.status === 'quota_exhausted') {
      if (!session) return { status: report.status };
      const { totalMinutes, activeMinutes, pausedMinutes } = this.computeSessionMinutes(session);
      return {
        status: report.status,
        session: {
          name: session.name,
          intent: session.final_intent || session.original_intent,
          total_minutes: Math.round(totalMinutes * 10) / 10,
          active_minutes: Math.round(activeMinutes * 10) / 10,
          paused_minutes: Math.round(pausedMinutes * 10) / 10,
        },
      };
    }
    if (!session) {
      return { status: 'failed' };
    }

    const { totalMinutes, activeMinutes, pausedMinutes } = this.computeSessionMinutes(session);

    const parsed = parseReportResponse(
      JSON.stringify({
        verdict: report.summary,
        patterns: JSON.parse(report.patterns || '[]'),
        suggestions: JSON.parse(report.suggestions || '[]'),
      })
    );

    return {
      status: 'ready',
      report: parsed,
      session: {
        name: session.name,
        intent: session.final_intent || session.original_intent,
        total_minutes: Math.round(totalMinutes * 10) / 10,
        active_minutes: Math.round(activeMinutes * 10) / 10,
        paused_minutes: Math.round(pausedMinutes * 10) / 10,
      },
    };
  }

  retryGeneration(sessionId: string): void {
    const report = this.reportRepo.getBySessionId(sessionId);
    if (!report) {
      throw new Error('No report found for session');
    }
    if (report.status !== 'failed' && report.status !== 'quota_exhausted') {
      throw new Error(`Cannot retry report in status: ${report.status}`);
    }

    this.reportRepo.resetToGenerating(report.report_id);
    this.generateInBackground(sessionId, report.report_id);
  }

  hasReport(sessionId: string): boolean {
    return this.reportRepo.hasReportForSession(sessionId);
  }

  getReportStatus(sessionId: string): 'none' | 'ready' | 'failed' | 'quota_exhausted' {
    return this.reportRepo.getStatusForSession(sessionId);
  }

  markStaleAsFailedOnLaunch(): number {
    return this.reportRepo.markStaleAsFailedOnLaunch();
  }

  deleteBySessionId(sessionId: string): void {
    this.reportRepo.deleteBySessionId(sessionId);
  }

  private generateInBackground(sessionId: string, reportId: string): void {
    (async () => {
      try {
        const aiService = this.getAiService();
        if (!aiService) {
          console.error('Report generation failed: no API key configured');
          this.reportRepo.updateToFailed(reportId);
          return;
        }

        const session = this.sessionRepo.getById(sessionId);
        if (!session) {
          this.reportRepo.updateToFailed(reportId);
          return;
        }

        const captures = this.captureRepo.getBySessionId(sessionId);
        const feelings = this.feelingRepo.getBySessionId(sessionId);
        const { events, totalMinutes, activeMinutes, pausedMinutes } = this.computeSessionMinutes(session);

        const collapsed = collapseCaptures(captures);

        const prompt = buildReportPrompt({
          intent: session.final_intent || session.original_intent,
          total_minutes: Math.round(totalMinutes * 10) / 10,
          active_minutes: Math.round(activeMinutes * 10) / 10,
          paused_minutes: Math.round(pausedMinutes * 10) / 10,
          feeling_count: feelings.length,
          collapsed_captures: collapsed,
          feelings,
          events,
        });

        const responseText = await aiService.generateReport(prompt);
        const parsed = parseReportResponse(responseText);

        this.reportRepo.updateToReady(
          reportId,
          parsed.verdict,
          JSON.stringify(parsed.patterns),
          JSON.stringify(parsed.suggestions),
        );
      } catch (error) {
        console.error('Report generation failed:', error);
        if (error instanceof AiServiceError && error.isQuota) {
          this.reportRepo.updateToQuotaExhausted(reportId);
        } else {
          this.reportRepo.updateToFailed(reportId);
        }
      }
    })();
  }

  private computeSessionMinutes(session: Session): {
    events: SessionEvent[];
    totalMinutes: number;
    activeMinutes: number;
    pausedMinutes: number;
  } {
    const events = this.eventsRepo.getBySessionId(session.session_id);
    const totalMinutes = session.started_at
      ? (new Date(session.ended_at || new Date().toISOString()).getTime() - new Date(session.started_at).getTime()) / 60000
      : 0;
    const activeMinutes = calculateActiveMinutes(session.started_at, events, session.ended_at || undefined);
    const pausedMinutes = Math.max(0, totalMinutes - activeMinutes);
    return { events, totalMinutes, activeMinutes, pausedMinutes };
  }
}
