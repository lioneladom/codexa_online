'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/config/api';

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  status: string;
  duration: number;
  createdAt: string;
  studentPassword?: string;
  invigilatorPassword?: string;
  studentAccessUrl?: string;
  invigilatorAccessUrl?: string;
  accessCode?: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const fetchExams = async (token: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/exams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
    } else {
      fetchExams(token);
    }
  }, [router]);

  if (!mounted) {
    return null;
  }

  const handlePublish = async (examId: string) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) return;
    setPublishLoading(examId);
    try {
      const res = await fetch(`${getApiUrl()}/exams/${examId}/publish`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExams((prev) =>
          prev.map((exam) =>
            exam.id === examId ? { ...exam, ...data.exam, ...data } : exam
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishLoading(null);
    }
  };

  const getUrls = (exam: Exam) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const code = exam.accessCode || '';
    return {
      studentAccessUrl: `${origin}/exam/${code}`,
      invigilatorAccessUrl: `${origin}/invigilate/${code}`,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exams</h1>
        <Link
          href="/dashboard/exams/create"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          Create Exam
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading exams...</div>
      ) : (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-muted-foreground">No exams yet. Create your first exam!</p>
            </div>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="border border-border rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{exam.title}</h3>
                    <p className="text-muted-foreground">{exam.courseCode}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : exam.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span> {exam.duration} min
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </div>
                </div>

                 {exam.status === 'PUBLISHED' && exam.accessCode && (
                  <div className="mt-4 border-t border-border pt-4">
                    <h4 className="font-semibold mb-3">Access Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Student Access</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={getUrls(exam).studentAccessUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(getUrls(exam).studentAccessUrl)}
                            className="px-3 py-2 border border-border rounded-md hover:bg-muted"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Password: {exam.studentPassword}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Invigilator Access</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={getUrls(exam).invigilatorAccessUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(getUrls(exam).invigilatorAccessUrl)}
                            className="px-3 py-2 border border-border rounded-md hover:bg-muted"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Password: {exam.invigilatorPassword}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {exam.status === 'DRAFT' && (
                    <>
                      <Link
                        href={`/dashboard/exams/create?edit=${exam.id}`}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handlePublish(exam.id)}
                        disabled={publishLoading === exam.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {publishLoading === exam.id ? 'Publishing...' : 'Publish'}
                      </button>
                    </>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <Link
                      href={`/dashboard/exams/${exam.id}/monitor`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Monitor Exam
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
