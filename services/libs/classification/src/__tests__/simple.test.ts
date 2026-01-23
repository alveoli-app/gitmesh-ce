import { ClassificationService } from '../classificationService';

describe('Simple Classification Test', () => {
  it('should create a classification service', () => {
    const service = new ClassificationService();
    expect(service).toBeDefined();
  });
});