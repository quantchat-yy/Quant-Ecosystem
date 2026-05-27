import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { DocBranchingService } from '../services/doc-branching.service';

describe('DocBranchingService', () => {
  let service: DocBranchingService;

  beforeEach(() => {
    service = new DocBranchingService();
  });

  describe('createBranch', () => {
    it('creates a branch from document state', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Main branch content');
      const state = Y.encodeStateAsUpdate(doc);

      const branch = service.createBranch('doc-1', 'feature-branch', 'user-1', state);

      expect(branch.id).toBeDefined();
      expect(branch.docId).toBe('doc-1');
      expect(branch.branchName).toBe('feature-branch');
      expect(branch.userId).toBe('user-1');
      expect(branch.createdAt).toBeInstanceOf(Date);

      doc.destroy();
    });

    it('creates multiple branches from same document', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Base');
      const state = Y.encodeStateAsUpdate(doc);

      service.createBranch('doc-1', 'branch-a', 'user-1', state);
      service.createBranch('doc-1', 'branch-b', 'user-2', state);

      const branches = service.listBranches('doc-1');
      expect(branches).toHaveLength(2);

      doc.destroy();
    });
  });

  describe('listBranches', () => {
    it('returns empty array for document with no branches', () => {
      expect(service.listBranches('doc-1')).toEqual([]);
    });

    it('does not include state in listing', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Content');
      const state = Y.encodeStateAsUpdate(doc);

      service.createBranch('doc-1', 'branch', 'user-1', state);

      const branches = service.listBranches('doc-1');
      expect(branches[0]).not.toHaveProperty('state');

      doc.destroy();
    });
  });

  describe('getBranchState', () => {
    it('returns the branch state', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Branch content');
      const state = Y.encodeStateAsUpdate(doc);

      const branch = service.createBranch('doc-1', 'branch', 'user-1', state);

      const branchState = service.getBranchState(branch.id);
      expect(branchState).not.toBeNull();

      // Verify content
      const branchDoc = new Y.Doc();
      Y.applyUpdate(branchDoc, branchState!);
      expect(branchDoc.getText('content').toString()).toBe('Branch content');

      doc.destroy();
      branchDoc.destroy();
    });

    it('returns null for non-existent branch', () => {
      expect(service.getBranchState('non-existent')).toBeNull();
    });
  });

  describe('independent editing on branch', () => {
    it('branch modifications do not affect original state', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Original');
      const state = Y.encodeStateAsUpdate(doc);

      const branch = service.createBranch('doc-1', 'branch', 'user-1', state);

      // Modify branch state independently
      const branchDoc = new Y.Doc();
      Y.applyUpdate(branchDoc, service.getBranchState(branch.id)!);
      branchDoc.getText('content').insert(8, ' Modified');
      const newBranchState = Y.encodeStateAsUpdate(branchDoc);
      service.updateBranchState(branch.id, newBranchState);

      // Verify branch has modified content
      const updatedBranchDoc = new Y.Doc();
      Y.applyUpdate(updatedBranchDoc, service.getBranchState(branch.id)!);
      expect(updatedBranchDoc.getText('content').toString()).toBe('Original Modified');

      // Original state is unaffected (we stored it separately)
      const originalDoc = new Y.Doc();
      Y.applyUpdate(originalDoc, state);
      expect(originalDoc.getText('content').toString()).toBe('Original');

      doc.destroy();
      branchDoc.destroy();
      updatedBranchDoc.destroy();
      originalDoc.destroy();
    });
  });

  describe('mergeBranch', () => {
    it('merges branch changes back into target document', () => {
      // Create source document
      const sourceDoc = new Y.Doc();
      sourceDoc.getText('content').insert(0, 'Hello');
      const sourceState = Y.encodeStateAsUpdate(sourceDoc);

      // Create branch from source
      const branch = service.createBranch('doc-1', 'branch', 'user-1', sourceState);

      // Modify branch - add text
      const branchDoc = new Y.Doc();
      Y.applyUpdate(branchDoc, service.getBranchState(branch.id)!);
      branchDoc.getText('content').insert(5, ' World');
      const updatedBranchState = Y.encodeStateAsUpdate(branchDoc);
      service.updateBranchState(branch.id, updatedBranchState);

      // Merge branch back into the source state
      const mergedState = service.mergeBranch(branch.id, sourceState);
      expect(mergedState).not.toBeNull();

      // Verify merged content
      const mergedDoc = new Y.Doc();
      Y.applyUpdate(mergedDoc, mergedState!);
      expect(mergedDoc.getText('content').toString()).toBe('Hello World');

      sourceDoc.destroy();
      branchDoc.destroy();
      mergedDoc.destroy();
    });

    it('returns null for non-existent branch', () => {
      const doc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(doc);
      expect(service.mergeBranch('non-existent', state)).toBeNull();
      doc.destroy();
    });
  });
});
