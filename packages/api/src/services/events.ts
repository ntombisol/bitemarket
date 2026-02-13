import { EventEmitter } from "node:events";
import crypto from "node:crypto";
import type { FlowEvent, FlowEventType } from "../types.js";

const MAX_HISTORY = 100;

class EventBus {
  private emitter = new EventEmitter();
  private history: FlowEvent[] = [];

  emit(type: FlowEventType, data: Record<string, unknown>): FlowEvent {
    const event: FlowEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      data,
    };
    this.history.push(event);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.emitter.emit("event", event);
    return event;
  }

  subscribe(callback: (event: FlowEvent) => void): () => void {
    this.emitter.on("event", callback);
    return () => this.emitter.off("event", callback);
  }

  getHistory(): FlowEvent[] {
    return [...this.history];
  }
}

export const eventBus = new EventBus();
