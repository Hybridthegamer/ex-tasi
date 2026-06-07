const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const ProctorEvent = require('../models/ProctorEvent');

const autoGrade = (question, answer) => {
  if (!question.isAutoGraded) {
    return { score: 0, isCorrect: false, isGraded: false };
  }

  const correct = question.correctAnswer;
  let isCorrect = false;

  switch (question.type) {
    case 'multiple_choice':
      if (question.allowMultiple) {
        const studentArr = (Array.isArray(answer) ? answer : [answer]).sort();
        const correctArr = (Array.isArray(correct) ? correct : [correct]).sort();
        isCorrect = JSON.stringify(studentArr) === JSON.stringify(correctArr);
      } else {
        isCorrect = String(answer).trim() === String(correct).trim();
      }
      break;

    case 'true_false':
      isCorrect = String(answer).toLowerCase() === String(correct).toLowerCase();
      break;

    case 'fill_blank':
    case 'short_answer':
      if (question.caseSensitive) {
        isCorrect = String(answer).trim() === String(correct).trim();
      } else {
        isCorrect = String(answer).trim().toLowerCase() === String(correct).trim().toLowerCase();
      }
      break;

    default:
      return { score: 0, isCorrect: false, isGraded: false };
  }

  return {
    score: isCorrect ? question.points : 0,
    isCorrect,
    isGraded: true
  };
};

exports.startQuiz = async (req, res) => {
  try {
    const { quizId } = req.body;
    const quiz = await Quiz.findById(quizId);

    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json({ message: 'Quiz not found or not active.' });
    }
    if (quiz.deadline && new Date() > new Date(quiz.deadline)) {
      return res.status(400).json({ message: 'Quiz deadline has passed.' });
    }

    let submission = await Submission.findOne({
      student: req.user._id,
      quiz: quizId,
      status: 'in_progress'
    });

    if (!submission) {
      const done = await Submission.findOne({
        student: req.user._id,
        quiz: quizId,
        status: { $in: ['submitted', 'graded', 'auto_submitted'] }
      });
      if (done) return res.status(400).json({ message: 'Already submitted.', submissionId: done._id });

      const startTime = new Date();
      const timeLimit = quiz.duration
        ? new Date(startTime.getTime() + quiz.duration * 60_000)
        : null;

      submission = await Submission.create({
        student: req.user._id,
        quiz: quizId,
        startedAt: startTime,
        timeLimit,
        maxPossibleScore: quiz.totalPoints
      });
    }

    let questions = quiz.questions.map((q) => ({
      id: q._id,
      type: q.type,
      text: q.text,
      media: q.media,
      mediaType: q.mediaType,
      options: q.options,
      allowMultiple: q.allowMultiple,
      points: q.points,
      hint: q.hint,
      order: q.order
    }));

    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    if (quiz.isLive) {
      const existing = await ProctorEvent.findOne({ quiz: quizId, student: req.user._id });
      if (!existing) {
        await ProctorEvent.create({
          quiz: quizId,
          student: req.user._id,
          submission: submission._id,
          events: [{ type: 'joined', details: 'Student started the quiz' }]
        });
      } else {
        existing.events.push({ type: 'reconnected', details: 'Student reconnected' });
        existing.isConnected = true;
        await existing.save();
      }
    }

    res.json({
      submissionId: submission._id,
      questions,
      startedAt: submission.startedAt,
      timeLimit: submission.timeLimit,
      existingAnswers: submission.answers.map((a) => ({
        questionId: a.question,
        answer: a.answer
      }))
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in_progress'
    });
    if (!submission) return res.status(404).json({ message: 'Active submission not found.' });

    if (submission.timeLimit && new Date() > submission.timeLimit) {
      return res.status(400).json({ message: 'Time limit exceeded.', expired: true });
    }

    const quiz = await Quiz.findById(submission.quiz);
    const question = quiz.questions.id(questionId);
    if (!question) return res.status(400).json({ message: 'Question not found.' });

    const graded = autoGrade(question, answer);

    const existingIdx = submission.answers.findIndex(
      (a) => a.question.toString() === questionId
    );

    const answerData = {
      question: questionId,
      questionType: question.type,
      answer,
      maxScore: question.points,
      ...graded
    };

    if (existingIdx >= 0) {
      submission.answers[existingIdx] = answerData;
    } else {
      submission.answers.push(answerData);
    }

    await submission.save();
    res.json({ saved: true });
  } catch (error) {
    res.status(500).json({ message: 'Error saving answer.', error: error.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.status !== 'in_progress') {
      return res.status(400).json({ message: 'Quiz already submitted.' });
    }

    const quiz = await Quiz.findById(submission.quiz);

    let totalScore = 0;
    for (const ans of submission.answers) {
      const question = quiz.questions.id(ans.question);
      if (question && !ans.isGraded) {
        const graded = autoGrade(question, ans.answer);
        ans.score = graded.score;
        ans.isCorrect = graded.isCorrect;
        ans.isGraded = graded.isGraded;
      }
      totalScore += ans.score || 0;
    }

    const maxScore = quiz.totalPoints || 1;
    submission.totalScore = totalScore;
    submission.maxPossibleScore = maxScore;
    submission.percentage = Math.round((totalScore / maxScore) * 100);
    submission.passed = submission.percentage >= (quiz.passingScore || 50);
    submission.submittedAt = new Date();
    submission.status = req.body.autoSubmitted ? 'auto_submitted' : 'submitted';

    await submission.save();

    if (quiz.isLive) {
      await ProctorEvent.findOneAndUpdate(
        { quiz: submission.quiz, student: req.user._id },
        {
          $push: {
            events: {
              type: submission.status === 'auto_submitted' ? 'auto_submitted' : 'submitted',
              details: `Quiz ${submission.status}`
            }
          },
          isConnected: false
        }
      );
    }

    if (!quiz.showResultsImmediately) {
      return res.json({ submissionId: submission._id, message: 'Quiz submitted successfully!' });
    }

    const resultAnswers = submission.answers.map((ans) => {
      const q = quiz.questions.id(ans.question);
      return {
        questionId: ans.question,
        questionText: q?.text || '',
        questionType: ans.questionType,
        media: q?.media || '',
        options: q?.options || [],
        yourAnswer: ans.answer,
        correctAnswer: q?.isAutoGraded ? q?.correctAnswer : null,
        explanation: q?.explanation || '',
        score: ans.score,
        maxScore: ans.maxScore,
        isCorrect: ans.isCorrect,
        isGraded: ans.isGraded
      };
    });

    res.json({
      submissionId: submission._id,
      results: {
        quizTitle: quiz.title,
        totalScore: submission.totalScore,
        maxPossibleScore: submission.maxPossibleScore,
        percentage: submission.percentage,
        passed: submission.passed,
        passingScore: quiz.passingScore,
        submittedAt: submission.submittedAt,
        answers: resultAnswers
      }
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.getResult = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name email')
      .populate('quiz', 'title totalPoints passingScore showResultsImmediately questions allowReview tutor');

    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    const isOwner = submission.student._id.toString() === req.user._id.toString();
    const isTutor = submission.quiz.tutor?.toString() === req.user._id.toString();

    if (!isOwner && !isTutor) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const quiz = submission.quiz;

    const answers = submission.answers.map((ans) => {
      const q = quiz.questions.id(ans.question);
      return {
        questionId: ans.question,
        questionText: q?.text || '',
        questionType: ans.questionType,
        media: q?.media || '',
        options: q?.options || [],
        yourAnswer: ans.answer,
        correctAnswer: isTutor || (quiz.allowReview && quiz.showResultsImmediately)
          ? (q?.isAutoGraded ? q?.correctAnswer : null)
          : null,
        explanation: q?.explanation || '',
        score: ans.score,
        maxScore: ans.maxScore,
        isCorrect: ans.isCorrect,
        isGraded: ans.isGraded,
        tutorFeedback: ans.tutorFeedback
      };
    });

    res.json({
      submissionId: submission._id,
      student: isTutor ? { name: submission.student.name, email: submission.student.email } : undefined,
      quizTitle: quiz.title,
      totalScore: submission.totalScore,
      maxPossibleScore: submission.maxPossibleScore,
      percentage: submission.percentage,
      passed: submission.passed,
      passingScore: quiz.passingScore,
      submittedAt: submission.submittedAt,
      startedAt: submission.startedAt,
      status: submission.status,
      flagged: submission.flagged,
      tabSwitches: isTutor ? submission.tabSwitches : undefined,
      answers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.getStudentHistory = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user._id,
      status: { $ne: 'in_progress' }
    })
      .populate('quiz', 'title totalPoints passingScore institution tutor')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getQuizSubmissions = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, tutor: req.user._id });
    if (!quiz) return res.status(403).json({ message: 'Access denied.' });

    const submissions = await Submission.find({
      quiz: req.params.quizId,
      status: { $ne: 'in_progress' }
    })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.logProctoringEvent = async (req, res) => {
  try {
    const { eventType, details } = req.body;
    const submission = await Submission.findById(req.params.id);
    if (!submission || submission.student.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Not found.' });
    }

    if (eventType === 'tab_switch') submission.tabSwitches += 1;
    if (eventType === 'focus_loss') submission.focusLostCount += 1;
    if (eventType === 'paste_attempt') submission.pasteAttempts += 1;

    if (submission.tabSwitches >= 3 || submission.focusLostCount >= 5) {
      submission.flagged = true;
      submission.flagReason = `Suspicious activity: ${submission.tabSwitches} tab switch(es), ${submission.focusLostCount} focus loss(es)`;
    }
    await submission.save();

    await ProctorEvent.findOneAndUpdate(
      { quiz: submission.quiz, student: req.user._id },
      { $push: { events: { type: eventType, details } }, lastSeen: new Date() }
    );

    res.json({ logged: true, flagged: submission.flagged });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.gradeAnswer = async (req, res) => {
  try {
    const { questionId, score, feedback } = req.body;
    const submission = await Submission.findById(req.params.id).populate('quiz');

    if (!submission) return res.status(404).json({ message: 'Not found.' });
    if (submission.quiz.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const ans = submission.answers.find((a) => a.question.toString() === questionId);
    if (!ans) return res.status(404).json({ message: 'Answer not found.' });

    ans.score = Math.min(score, ans.maxScore);
    ans.isGraded = true;
    ans.tutorFeedback = feedback || '';

    submission.totalScore = submission.answers.reduce((s, a) => s + (a.score || 0), 0);
    submission.percentage = Math.round((submission.totalScore / submission.maxPossibleScore) * 100);
    submission.passed = submission.percentage >= submission.quiz.passingScore;
    submission.status = 'graded';

    await submission.save();
    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};