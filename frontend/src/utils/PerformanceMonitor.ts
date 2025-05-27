import Stats from 'stats.js';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '../App';

// Safe wrapper for using AppToaster
const safeShowToast = (props: any) => {
  if (AppToaster && typeof AppToaster.show === 'function') {
    try {
      AppToaster.show(props);
    } catch (error) {
      console.error('Failed to show toast:', error);
    }
  } else {
    console.log('Toast message (AppToaster not available):', props.message);
  }
};

/**
 * PerformanceMonitor
 * 
 * A utility class that integrates Stats.js for performance monitoring
 * and provides methods to track frame time, memory usage, and custom metrics.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private stats: Stats;
  private enabled: boolean = false;
  private customPanels: Map<string, { panel: Stats.Panel, value: number }> = new Map();
  private warningThresholds: { fps: number, memory: number } = { fps: 30, memory: 100 };
  private lastWarningTime: number = 0;
  private warningCooldown: number = 5000; // 5 seconds between warnings
  private lastFpsValues: number[] = [];
  private fpsUpdateTime: number = 0;
  
  /**
   * Create a new PerformanceMonitor
   * @private - Use getInstance() instead
   */
  private constructor() {
    // Create Stats.js instance
    this.stats = new Stats();
    
    // Add FPS panel (Panel 0)
    this.stats.showPanel(0);
    
    // Style the stats container
    const statsElement = this.stats.dom;
    statsElement.style.position = 'absolute';
    statsElement.style.top = '0px';
    statsElement.style.right = '0px';
    statsElement.style.left = 'auto';
    statsElement.style.zIndex = '1000';
    
    // Add memory panel if supported
    if ((window.performance as any).memory) {
      this.addPanel(1); // Memory panel
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    
    return PerformanceMonitor.instance;
  }
  
  /**
   * Start monitoring performance
   */
  public start(): void {
    if (!this.enabled) {
      document.body.appendChild(this.stats.dom);
      this.enabled = true;
      
      // Log start
      console.log('Performance monitoring started');
    }
  }
  
  /**
   * Stop monitoring performance
   */
  public stop(): void {
    if (this.enabled) {
      document.body.removeChild(this.stats.dom);
      this.enabled = false;
      
      // Log stop
      console.log('Performance monitoring stopped');
    }
  }
  
  /**
   * Toggle monitoring on/off
   */
  public toggle(): boolean {
    if (this.enabled) {
      this.stop();
    } else {
      this.start();
    }
    
    return this.enabled;
  }
  
  /**
   * Begin a performance measurement
   */
  public begin(): void {
    if (this.enabled) {
      this.stats.begin();
    }
  }
  
  /**
   * End a performance measurement
   */
  public end(): void {
    if (this.enabled) {
      this.stats.end();
      
      // Update FPS values array for our custom getFPS method
      const now = Date.now();
      if (now - this.fpsUpdateTime > 1000) {
        this.fpsUpdateTime = now;
        
        // Extract FPS from the stats panel DOM
        try {
          const fpsText = this.stats.dom.querySelector('.fps')?.textContent || '';
          const fpsMatch = fpsText.match(/([0-9]+)/);
          if (fpsMatch && fpsMatch[1]) {
            const fps = parseInt(fpsMatch[1], 10);
            
            // Keep last 10 FPS values for averaging
            this.lastFpsValues.push(fps);
            if (this.lastFpsValues.length > 10) {
              this.lastFpsValues.shift();
            }
          }
        } catch (error) {
          console.error('Error extracting FPS value:', error);
        }
      }
      
      // Check for performance warnings
      this.checkPerformanceWarnings();
    }
  }
  
  /**
   * Add a stats panel
   * @param panelId The panel ID (0: fps, 1: ms, 2: mb)
   */
  public addPanel(panelId: number): void {
    this.stats.addPanel(new Stats.Panel('', '#0ff', '#002'));
    this.stats.showPanel(panelId);
  }
  
  /**
   * Add a custom panel
   * @param name The panel name
   * @param color The text color
   * @param bgColor The background color
   */
  public addCustomPanel(name: string, color: string = '#0ff', bgColor: string = '#002'): void {
    const panel = new Stats.Panel(name, color, bgColor);
    this.stats.addPanel(panel);
    this.customPanels.set(name, { panel, value: 0 });
  }
  
  /**
   * Update a custom panel value
   * @param name The panel name
   * @param value The new value
   */
  public updateCustomPanel(name: string, value: number): void {
    if (this.enabled && this.customPanels.has(name)) {
      const panelData = this.customPanels.get(name)!;
      panelData.value = value;
      panelData.panel.update(value, 100); // 100 is the max value
    }
  }
  
  /**
   * Set warning thresholds
   * @param fps FPS threshold (warning if below)
   * @param memory Memory threshold in MB (warning if above)
   */
  public setWarningThresholds(fps: number, memory: number): void {
    this.warningThresholds = { fps, memory };
  }
  
  /**
   * Get current FPS value
   * @returns The current FPS value or 60 if not available
   */
  public getFPS(): number {
    if (this.lastFpsValues.length === 0) {
      return 60; // Default to 60 FPS if no data available
    }
    
    // Calculate average FPS from the last values
    const sum = this.lastFpsValues.reduce((a, b) => a + b, 0);
    return sum / this.lastFpsValues.length;
  }
  
  /**
   * Check for performance warnings
   * @private
   */
  private checkPerformanceWarnings(): void {
    const now = Date.now();
    
    // Only check every few seconds to avoid spamming warnings
    if (now - this.lastWarningTime < this.warningCooldown) {
      return;
    }
    
    // Get current FPS using our custom method
    const currentFps = this.getFPS();
    
    // Check FPS threshold
    if (currentFps < this.warningThresholds.fps) {
      safeShowToast({
        message: `Performance warning: Low FPS (${Math.round(currentFps)})`,
        intent: Intent.WARNING,
        icon: "warning-sign",
        timeout: 3000
      });
      
      this.lastWarningTime = now;
    }
    
    // Check memory if available
    if ((window.performance as any).memory) {
      const memory = (window.performance as any).memory.usedJSHeapSize / (1024 * 1024);
      
      if (memory > this.warningThresholds.memory) {
        safeShowToast({
          message: `Performance warning: High memory usage (${Math.round(memory)} MB)`,
          intent: Intent.WARNING,
          icon: "warning-sign",
          timeout: 3000
        });
        
        this.lastWarningTime = now;
      }
    }
  }
  
  /**
   * Check if monitoring is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Get the Stats.js instance
   */
  public getStats(): Stats {
    return this.stats;
  }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

export default performanceMonitor; 