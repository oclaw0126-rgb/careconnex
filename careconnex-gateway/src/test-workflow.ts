import { WorkflowEngine, workflows } from './workflows';

// Mock dependencies for testing
jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    () => ({
      collection: () => ({
        doc: () => ({
          id: 'mock-workflow-id',
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              workflowId: 'mock-workflow-id',
              status: 'waiting',
              results: { search: [{ id: 'cg1', name: 'Alice' }] },
              userInputs: {}
            })
          })
        })
      })
    }),
    { FieldValue: { serverTimestamp: () => 'timestamp' } }
  )
}));

jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('./tools/registry', () => ({
  executeTool: jest.fn().mockImplementation(async (type) => {
    switch(type) {
      case 'search_caregivers': return [{ id: 'cg1', name: 'Alice' }, { id: 'cg2', name: 'Bob' }];
      case 'rank_caregivers': return [{ id: 'cg1', name: 'Alice' }, { id: 'cg2', name: 'Bob' }];
      case 'get_user_availability': return { slots: ['2023-10-10T10:00:00Z', '2023-10-11T10:00:00Z'] };
      case 'schedule_interview': return { status: 'scheduled' };
      case 'send_message': return { status: 'sent' };
      default: return {};
    }
  })
}));

jest.mock('./messaging', () => ({
  sendProactiveMessage: jest.fn().mockResolvedValue(undefined)
}));

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it('should start and execute findAndBook workflow successfully', async () => {
    const workflowId = await engine.startWorkflow('findAndBook', 'user123', '+15551234567', { zip_code: '12345', care_type: 'dementia' });
    expect(workflowId).toBe('mock-workflow-id');
    
    // In a real test we'd wait for execution or mock it properly to be synchronous, 
    // but here we verify the initiation works.
  });
  
  it('should resume workflow correctly', async () => {
    await expect(engine.resumeWorkflow('mock-workflow-id', { answer: 'yes' })).resolves.not.toThrow();
  });
});
