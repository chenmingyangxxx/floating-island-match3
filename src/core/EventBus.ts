type Handler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEvents, Set<Handler<unknown>>>();

  on<TKey extends keyof TEvents>(event: TKey, handler: Handler<TEvents[TKey]>): () => void {
    const bucket = this.handlers.get(event) ?? new Set<Handler<unknown>>();
    bucket.add(handler as Handler<unknown>);
    this.handlers.set(event, bucket);

    return () => {
      bucket.delete(handler as Handler<unknown>);
    };
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const bucket = this.handlers.get(event);
    if (!bucket) {
      return;
    }

    for (const handler of bucket) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

