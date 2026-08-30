import type { HashieLanguage } from '../intelligence/types.js';

export type ReviewedContentHit = {
  id: string;
  title: string;
  body: string;
  source: string;
};

export interface ReviewedContentRetriever {
  search(input: { query: string; language: HashieLanguage; limit: number }): Promise<ReviewedContentHit[]>;
}
