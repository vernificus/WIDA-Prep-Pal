export enum Domain {
  LISTENING = 'Listening',
  READING = 'Reading',
  SPEAKING = 'Speaking',
  WRITING = 'Writing'
}

export enum GradeCluster {
  G1 = 'Grade 1',
  G2_3 = 'Grades 2-3',
  G4_5 = 'Grades 4-5'
}

export interface QuestionData {
  id: string;
  domain: Domain;
  promptText: string;
  questionText: string;
  options?: string[]; // For Reading/Listening
  correctOption?: string; // For Reading/Listening
  imageUrl?: string; // Optional context image
  rubric?: string; // For Speaking/Writing (hidden from student, used for system instruction)
}

export interface FeedbackData {
  score: number; // 1-6 scale roughly matching WIDA
  feedbackText: string; // Kid-friendly feedback
  corrections?: string;
}

export interface AudioState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
}
