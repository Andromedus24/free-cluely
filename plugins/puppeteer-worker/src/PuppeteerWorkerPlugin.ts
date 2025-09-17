import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import {
  Plugin,
  PluginBus,
  ConfigManager,
  Logger,
  PuppeteerRequest,
  PuppeteerResponse,
  PuppeteerWorker as IPuppeteerWorker,
  PluginError
} from '@free-cluely/shared';

export class PuppeteerWorkerPlugin implements Plugin, IPuppeteerWorker {
  name = 'puppeteer-worker';
  version = '1.0.0';
  description = 'Browser automation plugin for web scraping and testing';
  author = 'Free-Cluely Team';
  permissions = ['automation', 'network'];

  private browser?: puppeteer.Browser;
  private page?: puppeteer.Page;
  private config?: ConfigManager;
  private logger?: Logger;
  private isActive = false;

  async initialize(bus: PluginBus, config: ConfigManager, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    
    try {
      await this.startBrowser();
      this.setupMessageHandlers(bus);
      this.isActive = true;
      
      this.logger.info('Puppeteer Worker plugin initialized successfully', { plugin: this.name });
    } catch (error) {
      this.logger.error(`Failed to initialize Puppeteer Worker: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    this.isActive = false;
    
    try {
      await this.stopBrowser();
      this.logger.info('Puppeteer Worker plugin destroyed', { plugin: this.name });
    } catch (error) {
      this.logger.error(`Error destroying Puppeteer Worker: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
    }
  }

  private async startBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set default viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Set default timeout
      this.page.setDefaultTimeout(30000);
      
      this.logger?.debug('Puppeteer browser started', { plugin: this.name });
    } catch (error) {
      throw new PluginError(`Failed to start Puppeteer browser: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  private async stopBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = undefined;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  private setupMessageHandlers(bus: PluginBus): void {
    bus.onMessage(async (message) => {
      if (message.plugin === this.name) {
        try {
          const response = await this.handleMessage(message);
          bus.handleResponse(response);
        } catch (error) {
          const errorResponse = {
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            plugin: this.name,
            timestamp: Date.now()
          };
          bus.handleResponse(errorResponse);
        }
      }
    });
  }

  private async handleMessage(message: any): Promise<any> {
    if (!this.isActive || !this.page) {
      throw new PluginError('Plugin is not active or browser not ready', this.name);
    }

    const request: PuppeteerRequest = message.payload;
    
    switch (request.action) {
      case 'navigate':
        return await this.navigate(request.url, request.options);
      case 'click':
        return await this.click(request.selector!, request.options);
      case 'type':
        return await this.type(request.selector!, request.text!, request.options);
      case 'screenshot':
        return await this.screenshot(request.options);
      case 'extract':
        return await this.extract(request.selector!, request.options);
      case 'wait':
        return await this.wait(request.selector!, request.options);
      default:
        throw new PluginError(`Unknown action: ${request.action}`, this.name);
    }
  }

  async navigate(url: string, options: { timeout?: number; waitUntil?: string } = {}): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    // Check domain allowlist
    if (!this.isUrlAllowed(url)) {
      throw new PluginError(`URL not allowed: ${url}`, this.name);
    }

    try {
      const { timeout = 30000, waitUntil = 'networkidle2' } = options;
      
      await this.page.goto(url, {
        timeout,
        waitUntil: waitUntil as any
      });
      
      this.logger?.info(`Navigated to: ${url}`, { plugin: this.name });
      return true;
    } catch (error) {
      this.logger?.error(`Failed to navigate to ${url}: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  async click(selector: string, options: { timeout?: number; button?: string } = {}): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      const { timeout = 5000 } = options;
      
      await this.page.waitForSelector(selector, { timeout });
      await this.page.click(selector, options);
      
      this.logger?.debug(`Clicked element: ${selector}`, { plugin: this.name });
      return true;
    } catch (error) {
      this.logger?.error(`Failed to click element ${selector}: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  async type(selector: string, text: string, options: { delay?: number; timeout?: number } = {}): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      const { delay = 50, timeout = 5000 } = options;
      
      await this.page.waitForSelector(selector, { timeout });
      await this.page.type(selector, text, { delay });
      
      this.logger?.debug(`Typed text in element: ${selector}`, { plugin: this.name });
      return true;
    } catch (error) {
      this.logger?.error(`Failed to type in element ${selector}: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  async screenshot(options: { fullPage?: boolean; selector?: string } = {}): Promise<string> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      const { fullPage = false, selector } = options;
      let screenshot: Buffer;
      
      if (selector) {
        const element = await this.page.waitForSelector(selector);
        screenshot = await element?.screenshot() as Buffer;
      } else {
        screenshot = await this.page.screenshot({ fullPage });
      }
      
      const base64 = screenshot.toString('base64');
      this.logger?.debug('Screenshot captured', { plugin: this.name });
      
      return base64;
    } catch (error) {
      this.logger?.error(`Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async extract(selector: string, options: { attribute?: string; multiple?: boolean } = {}): Promise<string | string[]> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      const { attribute, multiple = false } = options;
      
      await this.page.waitForSelector(selector);
      
      if (multiple) {
        const elements = await this.page.$$(selector);
        
        if (attribute) {
          return await Promise.all(
            elements.map(async (el) => await el.evaluate((node, attr) => node.getAttribute(attr), attribute))
          );
        } else {
          return await Promise.all(
            elements.map(async (el) => await el.evaluate(node => node.textContent))
          );
        }
      } else {
        const element = await this.page.$(selector);
        
        if (attribute) {
          return await element?.evaluate((node, attr) => node.getAttribute(attr), attribute) || '';
        } else {
          return await element?.evaluate(node => node.textContent) || '';
        }
      }
    } catch (error) {
      this.logger?.error(`Failed to extract from selector ${selector}: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async wait(selector: string, options: { timeout?: number; visible?: boolean } = {}): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      const { timeout = 5000, visible = true } = options;
      
      await this.page.waitForSelector(selector, { timeout, visible });
      
      this.logger?.debug(`Waited for element: ${selector}`, { plugin: this.name });
      return true;
    } catch (error) {
      this.logger?.error(`Failed to wait for element ${selector}: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  private isUrlAllowed(url: string): boolean {
    if (!this.config) {
      return false;
    }

    const automationConfig = this.config.getAutomationConfig();
    const allowlist = automationConfig.allowlist || [];

    // If no allowlist, allow all URLs
    if (allowlist.length === 0) {
      return true;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      return allowlist.some(allowedDomain => {
        // Support wildcard domains
        if (allowedDomain.startsWith('*.')) {
          const baseDomain = allowedDomain.substring(2);
          return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
        }
        
        return domain === allowedDomain;
      });
    } catch (error) {
      return false;
    }
  }

  // Helper methods for common automation tasks
  async fillForm(selector: string, data: Record<string, string>): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      for (const [field, value] of Object.entries(data)) {
        const fieldSelector = `${selector} [name="${field}"], ${selector} [id="${field}"], ${selector} [data-testid="${field}"]`;
        await this.type(fieldSelector, value);
      }
      
      return true;
    } catch (error) {
      this.logger?.error(`Failed to fill form: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  async scrollToElement(selector: string): Promise<boolean> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      await this.page.waitForSelector(selector);
      await this.page.$eval(selector, (element) => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      return true;
    } catch (error) {
      this.logger?.error(`Failed to scroll to element: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return false;
    }
  }

  async getInnerText(selector: string): Promise<string> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    try {
      await this.page.waitForSelector(selector);
      return await this.page.$eval(selector, (element) => element.innerText);
    } catch (error) {
      this.logger?.error(`Failed to get inner text: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async getPageTitle(): Promise<string> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new PluginError('Browser page not available', this.name);
    }

    return this.page.url();
  }
}