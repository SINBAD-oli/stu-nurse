// ./js/quizBuilderStandalone.jsx

import { db } from './js/firebase-config.js'; 
import { collection, getDocs, query, where, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const QuizBuilder = ({ onExit }) => {
  // Grab ALL components from the window
  const AddMCQ = window.AddMCQ;
  const AddSATA = window.AddSATA;
  const AddBowTie = window.AddBowTie;

  const [quizTitle, setQuizTitle] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('library');
  const [availableChapters, setAvailableChapters] = React.useState([]);
  const [selectedChapter, setSelectedChapter] = React.useState('');
  const [libraryQuestions, setLibraryQuestions] = React.useState([]);
  const [draftQuestions, setDraftQuestions] = React.useState([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const [manualType, setManualType] = React.useState(''); 

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); 
  };

  React.useEffect(() => {
    const fetchUniqueChapters = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const chaptersSet = new Set();
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.chapter) chaptersSet.add(data.chapter);
        });
        const uniqueChapters = Array.from(chaptersSet).sort((a, b) => 
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setAvailableChapters(uniqueChapters);
      } catch (error) {
        console.error("Error fetching chapters:", error);
      }
    };
    fetchUniqueChapters();
  }, []);

  React.useEffect(() => {
    if (!selectedChapter) return;
    const fetchQuestions = async () => {
      try {
        setLibraryQuestions([]); 
        const q = query(collection(db, "questions"), where("chapter", "==", selectedChapter));
        const querySnapshot = await getDocs(q);
        const fetchedQuestions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLibraryQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    fetchQuestions();
  }, [selectedChapter]);

  const handleAddToDraft = (question) => {
    if (!draftQuestions.find(q => q.id === question.id)) {
      setDraftQuestions([...draftQuestions, question]);
      showToast('Question added to draft!', 'success');
    } else {
      showToast('Question is already in your draft.', 'error');
    }
  };

  const handleManualAdd = (newQuestion) => {
    setDraftQuestions([...draftQuestions, newQuestion]);
    showToast(`${newQuestion.type} successfully added to draft!`, "success");
    setManualType(''); 
  };

  const handleRemoveFromDraft = (questionId) => {
    setDraftQuestions(draftQuestions.filter(q => q.id !== questionId));
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      showToast("Please enter a Quiz Title.", "error");
      return;
    }
    if (draftQuestions.length === 0) {
      showToast("Please add at least one question to save.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const questionsRef = collection(db, "questions");

      draftQuestions.forEach((q) => {
        const newDocRef = doc(questionsRef); 
        const { id, ...questionData } = q; 
        const newQuestion = {
          ...questionData,
          chapter: quizTitle.trim()
        };
        batch.set(newDocRef, newQuestion);
      });

      await batch.commit();
      showToast("Quiz successfully saved to your library!", "success");
      setQuizTitle('');
      setDraftQuestions([]);
      setAvailableChapters(prev => Array.from(new Set([...prev, quizTitle.trim()])).sort());
    } catch (error) {
      console.error("Error saving quiz:", error);
      showToast("Failed to save quiz. Check console.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen text-slate-800 font-sans relative">
      <button onClick={onExit} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium text-sm">
        ← Back to Portal
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Quiz</h1>
        <p className="text-slate-500">Build a custom test or chapter for the Stu Nurse portal.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Quiz Title (Chapter Name)</label>
        <input 
          type="text" 
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          placeholder="e.g., Midterm Review, Custom Exam 1"
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              From Firestore Library
            </button>
            <button 
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Manual Add
            </button>
          </div>

          {activeTab === 'library' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Chapter</label>
                <select value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="" disabled>Select a chapter...</option>
                  {availableChapters.map(chapter => (
                    <option key={chapter} value={chapter}>{chapter}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!selectedChapter ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Select a chapter above to view questions.</div>
                ) : libraryQuestions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading questions or no questions found...</div>
                ) : libraryQuestions.map((q) => {
                  const isAdded = draftQuestions.some(draftQ => draftQ.id === q.id);
                  return (
                    <div key={q.id} className={`border rounded-lg p-4 transition-colors ${isAdded ? 'border-green-300 bg-green-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">{q.type || 'MCQ'}</span>
                        <button 
                          onClick={() => handleAddToDraft(q)}
                          disabled={isAdded}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${isAdded ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        >
                          {isAdded ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                      <p className="font-medium text-slate-800 mb-4 text-sm">{q.questionText || "Question text not found."}</p>
                      {/* Only render simple options preview if it has them (ignores Bow Tie in this view) */}
                      {q.options && Array.isArray(q.options) && (
                        <div className="space-y-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`p-3 rounded-md border ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="text-sm text-slate-800 flex items-start gap-2 mb-1">
                                <span className={`mt-0.5 ${opt.isCorrect ? 'text-green-600 font-bold' : 'text-slate-400'}`}>{opt.isCorrect ? '✓' : '○'}</span>
                                <span className={opt.isCorrect ? 'font-medium' : ''}>{opt.text}</span>
                              </div>
                              {opt.rationale && <p className="text-xs text-slate-500 italic ml-6">Rationale: {opt.rationale}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px] overflow-hidden">
              {!manualType ? (
                <div className="p-8 h-full flex flex-col items-center justify-center bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-700 mb-6">Select Question Type</h3>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                    <button onClick={() => setManualType('MCQ')} className="p-6 bg-white border-2 border-blue-200 hover:border-blue-500 rounded-xl flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow-md">
                      <span className="font-bold text-blue-600 text-lg">MCQ</span>
                      <span className="text-xs text-slate-500 text-center">Multiple Choice Question</span>
                    </button>
                    <button onClick={() => setManualType('SATA')} className="p-6 bg-white border-2 border-purple-200 hover:border-purple-500 rounded-xl flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow-md">
                      <span className="font-bold text-purple-600 text-lg">SATA</span>
                      <span className="text-xs text-slate-500 text-center">Select All That Apply</span>
                    </button>
                    <button onClick={() => setManualType('BowTie')} className="p-6 bg-white border-2 border-orange-200 hover:border-orange-500 rounded-xl flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow-md">
                      <span className="font-bold text-orange-600 text-lg">Bow Tie</span>
                      <span className="text-xs text-slate-500 text-center">NGN Clinical Judgment</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {manualType === 'MCQ' && AddMCQ && (
                    <AddMCQ 
                      onAdd={handleManualAdd} 
                      onCancel={() => setManualType('')} 
                      draftCount={draftQuestions.length}
                      quizTitle={quizTitle}
                    />
                  )}
                  {manualType === 'SATA' && AddSATA && (
                    <AddSATA 
                      onAdd={handleManualAdd} 
                      onCancel={() => setManualType('')} 
                      draftCount={draftQuestions.length}
                      quizTitle={quizTitle}
                    />
                  )}
                  {manualType === 'BowTie' && AddBowTie && (
                    <AddBowTie 
                      onAdd={handleManualAdd} 
                      onCancel={() => setManualType('')} 
                      draftCount={draftQuestions.length}
                      quizTitle={quizTitle}
                    />
                  )}
                  {((manualType === 'MCQ' && !AddMCQ) || (manualType === 'SATA' && !AddSATA) || (manualType === 'BowTie' && !AddBowTie)) && (
                     <div className="p-8 text-center text-red-500">Error: Component failed to load. Check script tags in portal.html.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h2 className="font-semibold">Current Draft</h2>
                <p className="text-xs text-slate-300">{draftQuestions.length} questions added</p>
              </div>
              <button 
                onClick={handleSaveQuiz}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSaving ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                {isSaving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {draftQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <p>Your draft is empty.</p>
                </div>
              ) : (
                draftQuestions.map((q, index) => (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold uppercase ${q.type === 'SATA' ? 'text-purple-500' : q.type === 'BowTie' ? 'text-orange-500' : 'text-blue-500'}`}>
                        {q.type || 'MCQ'}
                      </span>
                      <p className="text-sm font-medium text-slate-800 mb-1 truncate">{q.questionText}</p>
                    </div>
                    <button onClick={() => handleRemoveFromDraft(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-50 flex items-center gap-2 ${toast.type === 'success' ? 'bg-slate-800 text-white border border-slate-700' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {toast.type === 'success' ? <span className="text-green-400">✓</span> : <span className="text-red-500">✕</span>}
          {toast.message}
        </div>
      )}
    </div>
  );
};

(function initReactBridge() {
  const triggerBtn = document.getElementById('standalone-create-quiz-btn');
  const rootElement = document.getElementById('react-builder-root');
  const mainPortalContent = document.getElementById('main-portal-content');
  let reactRoot = null;

  if (triggerBtn && rootElement && mainPortalContent) {
    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      mainPortalContent.classList.add('hidden');
      rootElement.classList.remove('hidden');
      if (!reactRoot) reactRoot = ReactDOM.createRoot(rootElement);
      reactRoot.render(
        <QuizBuilder onExit={() => {
          reactRoot.unmount();
          reactRoot = null;
          rootElement.classList.add('hidden');
          mainPortalContent.classList.remove('hidden');
        }} />
      );
    });
  }
})();