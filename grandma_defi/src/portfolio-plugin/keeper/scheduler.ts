import { logger } from "@elizaos/core";

export class PortfolioScheduler {
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule a recurring action
   */
  scheduleRecurring(
    id: string,
    action: () => Promise<void>,
    intervalMs: number
  ): void {
    // Clear existing schedule if any
    this.clearSchedule(id);

    const interval = setInterval(async () => {
      try {
        await action();
      } catch (error) {
        logger.error(`❌ Error in scheduled action ${id}:`, error);
      }
    }, intervalMs);

    this.schedules.set(id, interval);
    logger.info(`📅 Scheduled recurring action: ${id} (every ${intervalMs}ms)`);
  }

  /**
   * Schedule a one-time action
   */
  scheduleOnce(id: string, action: () => Promise<void>, delayMs: number): void {
    // Clear existing schedule if any
    this.clearSchedule(id);

    const timeout = setTimeout(async () => {
      try {
        await action();
        this.schedules.delete(id);
      } catch (error) {
        logger.error(`❌ Error in one-time action ${id}:`, error);
      }
    }, delayMs);

    this.schedules.set(id, timeout);
    logger.info(`⏰ Scheduled one-time action: ${id} (in ${delayMs}ms)`);
  }

  /**
   * Clear a scheduled action
   */
  clearSchedule(id: string): void {
    const existingSchedule = this.schedules.get(id);
    if (existingSchedule) {
      clearTimeout(existingSchedule);
      clearInterval(existingSchedule);
      this.schedules.delete(id);
      logger.info(`🗑️ Cleared schedule: ${id}`);
    }
  }

  /**
   * Clear all schedules
   */
  clearAllSchedules(): void {
    for (const [id, schedule] of this.schedules) {
      clearTimeout(schedule);
      clearInterval(schedule);
    }
    this.schedules.clear();
    logger.info("🗑️ All schedules cleared");
  }

  /**
   * Get active schedule count
   */
  getActiveScheduleCount(): number {
    return this.schedules.size;
  }

  /**
   * Get all active schedule IDs
   */
  getActiveScheduleIds(): string[] {
    return Array.from(this.schedules.keys());
  }

  /**
   * Check if a schedule exists
   */
  hasSchedule(id: string): boolean {
    return this.schedules.has(id);
  }
}
