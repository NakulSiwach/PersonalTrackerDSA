import type { Difficulty } from "./validation";

export interface FolderDTO {
  id: string;
  name: string;
  questionCount: number;
}

export interface QuestionDTO {
  id: string;
  folderId: string;
  title: string;
  link: string | null;
  difficulty: Difficulty;
  tags: string[];
  isPattern: boolean;
  /** Only set where questions from several folders are listed (Famous Patterns). */
  folderName?: string;
  lastRevisedAt: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
}
