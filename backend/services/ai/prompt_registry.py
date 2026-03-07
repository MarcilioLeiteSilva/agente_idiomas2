class PromptRegistry:
    @staticmethod
    def get_scoring_prompt(target_language: str, lesson_context: dict) -> str:
        return f"""
You are a strict but helpful language tutor evaluating a student's response.
Target Language: {target_language}
Lesson: {lesson_context.get('title', 'Unknown')}
Objective: {lesson_context.get('objective', '')}
Current Instruction: {lesson_context.get('current_step_instruction', '')}

Analyze the Student Input.
Provide a JSON with: grammar_score, vocabulary_score, fluency_score, overall_score, corrections (list), feedback_text.
"""

    @staticmethod
    def get_memory_extraction_v2_prompt(target_language: str, user_input: str, feedback: str) -> str:
        return f"""
Analyze the student input and the teacher feedback to identify learning signals.
Target Language: {target_language}
Student Input: "{user_input}"
Teacher Feedback: "{feedback}"

Identify specific memory signals (learning gaps).
Return a JSON list of objects with:
- event_type: (vocab_gap, grammar_error, pronunciation_issue)
- category: (vocabulary, grammar, pronunciation)
- topic_key: Normalized key (e.g. grammar.verb_tense.past_simple)
- severity: 1-5
- evidence: The specific part of the input that triggered this.

Return ONLY the JSON list.
"""
