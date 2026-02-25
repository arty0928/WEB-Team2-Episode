import * as Y from "yjs";

export interface YjsProcessor {
    buildUpdatedSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array;

    getUpdatedYDocFromSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Y.Doc;

    getSnapshotFromDoc(doc: Y.Doc): Uint8Array;
}

function hasUnresolvedPending(doc: Y.Doc): boolean {
    const store: any = (doc as any).store;
    const pending = store?.pendingStructs;

    if (!pending) return false;

    const hasClientPending = pending.clients && pending.clients.size > 0;

    const hasMissing = pending.missing && pending.missing.size > 0;

    return hasClientPending || hasMissing;
}

function logPending(doc: Y.Doc) {
    const store: any = (doc as any).store;

    if (!store?.pendingStructs) return;

    console.warn(`[YjsProcessor] ⚠ Pending Structs detected`);
}

export class DefaultYjsProcessor implements YjsProcessor {
    buildUpdatedSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array {
        const doc = this.getUpdatedYDocFromSnapshot(baseSnapshot, updates);

        if (hasUnresolvedPending(doc)) {
            logPending(doc);
        }

        return this.getSnapshotFromDoc(doc);
    }

    getUpdatedYDocFromSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Y.Doc {
        const doc = new Y.Doc();

        if (baseSnapshot && baseSnapshot.length > 0) {
            try {
                Y.applyUpdate(doc, baseSnapshot);
            } catch (e) {
                console.error("[YjsProcessor] 기존 base snapshot 데이터가 유효하지 않습니다.", e);
                throw e;
            }
        }

        for (const update of updates) {
            try {
                Y.applyUpdate(doc, update);
            } catch (e) {
                console.error("[YjsProcessor] 업데이트 패킷이 유효하지 않습니다.", e);
                throw e;
            }
        }

        return doc;
    }

    getSnapshotFromDoc(doc: Y.Doc): Uint8Array {
        if (hasUnresolvedPending(doc)) {
            logPending(doc);
        }

        try {
            return Y.encodeStateAsUpdate(doc);
        } catch (e) {
            console.error("[YjsProcessor] 유효하지 않은 YDoc 입니다.", e);
            throw e;
        }
    }
}
