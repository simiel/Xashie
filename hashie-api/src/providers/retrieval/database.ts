import type { ConversationRepository } from '../../db/repositories.js';
import type { ReviewedContentRetriever } from './types.js';
import type { HashieLanguage } from '../intelligence/types.js';

export class DatabaseReviewedContentRetriever implements ReviewedContentRetriever {
  constructor(private readonly repository: ConversationRepository) {}
  async search(input: { query: string; language: HashieLanguage; limit: number }) {
    return this.repository.reviewed(input.language, input.query, input.limit);
  }
}
