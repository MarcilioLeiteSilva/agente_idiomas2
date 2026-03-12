class Lesson {
  final String id;
  final String title;
  final String language;
  final String level;

  Lesson({
    required this.id,
    required this.title,
    required this.language,
    required this.level,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      language: json['language'] ?? '',
      level: json['level'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'language': language,
      'level': level,
    };
  }
}
