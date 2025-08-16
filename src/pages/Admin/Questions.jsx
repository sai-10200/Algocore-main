import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiPlus, FiUsers, FiSettings, FiSave, FiTrash2, FiEdit2, FiX, FiCheck, FiUserPlus, FiMail } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import SimpleModal from './SimpleModal';
import { ref, onValue, set, push, update, remove, get } from 'firebase/database';
import { database } from '../../firebase';
import LoadingPage from '../LoadingPage';

const Questions = ({ test, setTest, testId }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!testId) {
      setLoading(false);
      return;
    }

    const questionsRef = ref(database, `Exam/${testId}/questions`);
    const unsubscribe = onValue(questionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTest(prev => ({
          ...prev,
          questions: Array.isArray(data) ? data : Object.keys(data)
        }));
      } else {
        setTest(prev => ({
          ...prev,
          questions: []
        }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [testId, setTest]);

  const addQuestion = async (questions) => {
    try {
      const questionsRef = ref(database, `Exam/${testId}/questions`);

      // Get current questions
      const snapshot = await get(questionsRef);
      let currentQuestions = snapshot.val() || [];

      // Convert to array if stored as object
      if (currentQuestions && typeof currentQuestions === 'object' && !Array.isArray(currentQuestions)) {
        currentQuestions = Object.keys(currentQuestions);
      }

      // Convert single question to array for consistent handling
      const questionsToAdd = Array.isArray(questions) ? questions : [questions];

      // Add just the question names
      const questionNames = questionsToAdd.map(q => q.name || q.title || q);
      const updatedQuestions = [...currentQuestions, ...questionNames];

      await set(questionsRef, updatedQuestions);
      toast.success(`Added ${questionNames.length} question(s) successfully`);
      return updatedQuestions;
    } catch (err) {
      toast.error('Failed to add questions');
      throw err;
    }
  };

  const deleteQuestion = async (questionName) => {
    try {
      if (!test || !test.questions) return;

      // Get current questions from Firebase
      const questionsRef = ref(database, `Exam/${testId}/questions`);
      const snapshot = await get(questionsRef);
      let currentQuestions = snapshot.exists() ? snapshot.val() : [];

      // Convert to array if stored as object
      if (!Array.isArray(currentQuestions)) {
        currentQuestions = Object.keys(currentQuestions);
      }

      // Filter out the question to delete
      const updatedQuestions = currentQuestions.filter(
        q => q !== questionName
      );

      // Update Firebase
      await set(questionsRef, updatedQuestions);
      toast.success('Question deleted successfully');
      return updatedQuestions;
    } catch (err) {
      toast.error('Failed to delete question');
      console.error(err);
    }
  };

  const handleAddQuestions = (newQuestions) => {
    addQuestion(newQuestions)
      .then((updatedQuestions) => {
        if (updatedQuestions) {
          setTest(prev => ({
            ...prev,
            questions: updatedQuestions
          }));
        }
        setShowQuestionForm(false);
        setEditingQuestion(null);
      })
      .catch(console.error);
  };

  const handleDeleteQuestion = useCallback(async (questionName) => {
    if (!test) return;

    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        setIsSaving(true);
        const updatedQuestions = await deleteQuestion(questionName);
        if (updatedQuestions) {
          setTest(prev => ({
            ...prev,
            questions: updatedQuestions
          }));
        }
        toast.success('Question deleted successfully');
      } catch (error) {
        console.error('Error deleting question:', error);
        toast.error('Failed to delete question');
      } finally {
        setIsSaving(false);
      }
    }
  }, [test, deleteQuestion]);

  // Filter questions based on search
  const filteredQuestions = useMemo(() => {
    if (!questionSearchQuery) return test?.questions || [];
    return test?.questions.filter(question =>
      question.toLowerCase().includes(questionSearchQuery.toLowerCase())
    ) || [];
  }, [test?.questions, questionSearchQuery]);

  if (loading) {
    return (
      <LoadingPage message="Loading questions, please wait..."/>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {!test?.questions?.length ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No questions found</p>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setShowQuestionForm(true);
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPlus className="mr-2" /> Add Question
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Test Questions</h2>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionForm(true);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-1.5 h-4 w-4" />
              Add Question
            </button>
          </div>

          {/* Question Search */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search questions by title or description..."
                value={questionSearchQuery}
                onChange={(e) => setQuestionSearchQuery(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white p-2"
              />
            </div>
            <button
              onClick={() => {
                const results = filteredQuestions;
                toast.success(`Found ${results.length} matching questions`);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((question, index) => (
                <div key={index} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                        {index + 1}.
                      </span>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        {question}
                      </h3>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowQuestionForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question)}
                        className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                {questionSearchQuery ? 'No matching questions found' : 'No questions added yet'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <SimpleModal
          isOpen={showQuestionForm}
          onClose={() => {
            setEditingQuestion(null);
            setShowQuestionForm(false);
          }}
          onAddQuestions={(questions) => {
            handleAddQuestions(questions);
          }}
          questions={editingQuestion ? [editingQuestion] : []}
        />
      )}
    </div>
  );
};

export default Questions;
