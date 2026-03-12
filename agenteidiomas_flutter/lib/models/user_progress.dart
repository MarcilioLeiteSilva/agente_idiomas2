class UserProgress {
  final String lessonId;
  final String status;
  final int score;
  final String? completedAt;

  UserProgress({
    required this.lessonId,
    required this.status,
    required this.score,
    this.completedAt,
  });

  factory UserProgress.fromJson(Map<String, dynamic> json) {
    return UserProgress(
      lessonId: json['lesson_id'] ?? '',
      status: json['status'] ?? '',
      score: json['score'] ?? 0,
      completedAt: json['completed_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lesson_id': lessonId,
      'status': status,
      'score': score,
      'completed_at': completedAt,
    };
  }
}
