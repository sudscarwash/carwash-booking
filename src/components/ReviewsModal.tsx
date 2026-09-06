/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Trash2, Edit3, X, CheckCircle2, ShieldCheck, AlertCircle, CornerDownRight } from 'lucide-react';
import { CarWash, Review, ReviewSummary, Role, User } from '../types';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  carWash: CarWash | null;
  currentUser: User | null;
  targetBookingId?: string; // Optional: if launched from a completed booking
  onReviewSubmitted?: () => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  carWash,
  currentUser,
  targetBookingId,
  onReviewSubmitted,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');

  // Customer form state
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Owner reply state (keyed by reviewId)
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Short, concise limit (industry standard for mobile services, quick to read, lightweight for DB)
  const MAX_CHAR_LIMIT = 250;

  // Authorization flags
  const isOwnerOfThisWash = currentUser && (
    currentUser.role === Role.ADMIN ||
    (currentUser.role === Role.OWNER && carWash && carWash.ownerId === currentUser.id)
  );

  const canModerate = currentUser && (
    currentUser.role === Role.ADMIN ||
    currentUser.role === Role.SPECIAL
  );

  const canWriteReview = currentUser && currentUser.role === Role.CUSTOMER;

  const fetchReviewsAndSummary = async () => {
    if (!carWash) return;
    setIsLoading(true);
    try {
      const [revRes, sumRes] = await Promise.all([
        fetch(`/api/reviews?carWashId=${carWash.id}`),
        fetch(`/api/reviews/summary?carWashId=${carWash.id}`)
      ]);

      if (revRes.ok) {
        const data = await revRes.json();
        setReviews(Array.isArray(data) ? data : []);
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      // If user logged in, check if they have a review
      const token = localStorage.getItem('token');
      if (token && currentUser) {
        const myRes = await fetch(`/api/reviews/my?carWashId=${carWash.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (myRes.ok) {
          const myData = await myRes.json();
          if (myData.review) {
            setMyReview(myData.review);
            setRating(myData.review.rating);
            setComment(myData.review.comment);
          } else {
            setMyReview(null);
            setRating(5);
            setComment('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && carWash) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setReplyingReviewId(null);
      setIsEditing(!!targetBookingId);
      fetchReviewsAndSummary();
    }
  }, [isOpen, carWash?.id]);

  if (!isOpen || !carWash) return null;

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!comment.trim()) {
      setErrorMsg('Please enter your review feedback.');
      return;
    }

    if (comment.length > MAX_CHAR_LIMIT) {
      setErrorMsg(`Review feedback cannot exceed ${MAX_CHAR_LIMIT} characters.`);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMsg('Please log in to submit your review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          carWashId: carWash.id,
          rating,
          comment: comment.trim(),
          bookingId: targetBookingId || myReview?.bookingId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      const saved: Review = await res.json();
      setMyReview(saved);
      setIsEditing(false);
      setSuccessMsg(myReview ? 'Your review has been updated!' : 'Thank you! Your review was published.');
      fetchReviewsAndSummary();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving your review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const isSelf = myReview?.id === reviewId;
    const confirmPrompt = isSelf
      ? 'Are you sure you want to remove your review?'
      : 'Moderator confirmation: delete this review to combat spam or inappropriate content?';

    if (!window.confirm(confirmPrompt)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete review');
      }

      if (isSelf) {
        setMyReview(null);
        setRating(5);
        setComment('');
        setIsEditing(false);
        setSuccessMsg('Your review has been removed.');
      } else {
        setSuccessMsg('Review has been removed by moderator.');
      }

      fetchReviewsAndSummary();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    }
  };

  const handleSaveReply = async (reviewId: string) => {
    if (!replyText.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit reply');
      }

      setReplyingReviewId(null);
      setReplyText('');
      fetchReviewsAndSummary();
    } catch (err: any) {
      alert(err.message || 'Failed to submit reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this response?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete reply');
      }

      fetchReviewsAndSummary();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reply');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    return r.rating === selectedFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="reviews-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{carWash.name}</h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Business
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Ratings & Customer Reviews</p>
          </div>
          <button
            id="btn-close-reviews-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Scorecard */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left flex flex-col items-center sm:items-start min-w-[130px]">
              <div className="text-4xl font-black text-slate-900 flex items-baseline gap-1">
                {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '—'}
                <span className="text-base text-slate-400 font-normal">/ 5</span>
              </div>
              <div className="flex items-center gap-1 my-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(summary.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-slate-500">
                {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Star Distribution Bars */}
            <div className="flex-1 w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = summary.ratingCounts[s] || 0;
                const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-medium text-slate-600">{s}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-400 font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Customer Action: Write or Edit Review */}
          {canWriteReview && (
            <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4">
              {!isEditing && myReview ? (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        Your Review
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= myReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(myReview.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 font-medium leading-relaxed">{myReview.comment}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-edit-my-review"
                      onClick={() => {
                        setRating(myReview.rating);
                        setComment(myReview.comment);
                        setIsEditing(true);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      id="btn-delete-my-review"
                      onClick={() => handleDeleteReview(myReview.id)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ) : !isEditing && !myReview ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Have you used {carWash.name}?</h4>
                    <p className="text-xs text-slate-500">Share your experience to help fellow drivers in Brunei.</p>
                  </div>
                  <button
                    id="btn-start-write-review"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" /> Rate & Review
                  </button>
                </div>
              ) : (
                /* Active Edit Form */
                <form onSubmit={handleSaveReview} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {myReview ? 'Update Your Review' : `Rate ${carWash.name}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Star selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Your Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          id={`btn-star-select-${s}`}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(s)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              s <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
                    </span>
                  </div>

                  {/* Comment Input */}
                  <div>
                    <textarea
                      id="input-review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, MAX_CHAR_LIMIT))}
                      placeholder="Quick feedback: cleanliness, speed, waiting area, friendly staff..."
                      rows={2}
                      className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                      <span>Concise feedback (max {MAX_CHAR_LIMIT} chars)</span>
                      <span className={comment.length >= MAX_CHAR_LIMIT ? 'text-rose-500 font-bold' : 'font-mono'}>
                        {comment.length} / {MAX_CHAR_LIMIT}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-review"
                      disabled={isSubmitting || !comment.trim()}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : myReview ? 'Update Review' : 'Publish Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Reviews List & Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Customer Experiences ({filteredReviews.length})
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {(['ALL', 5, 4, 3, 2, 1] as const).map((filter) => (
                  <button
                    key={String(filter)}
                    id={`filter-reviews-${filter}`}
                    onClick={() => setSelectedFilter(filter)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                      selectedFilter === filter
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : `${filter}★`}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-slate-400 text-xs">Loading reviews...</div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500">
                  {selectedFilter === 'ALL'
                    ? 'No reviews yet for this car wash. Be the first to review!'
                    : `No ${selectedFilter}-star reviews found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => {
                  const isReviewAuthor = currentUser && currentUser.id === review.customerId;
                  return (
                    <div
                      key={review.id}
                      id={`review-card-${review.id}`}
                      className="border border-slate-200/80 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors"
                    >
                      {/* Review Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">
                              {review.customerName}
                            </span>
                            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verified Customer
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(review.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Actions for Moderator (Admin/Special) or Author */}
                        <div className="flex items-center gap-1">
                          {(canModerate || isReviewAuthor) && (
                            <button
                              id={`btn-delete-review-${review.id}`}
                              onClick={() => handleDeleteReview(review.id)}
                              title={canModerate ? 'Moderator: Delete Review (Spam Protection)' : 'Delete My Review'}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment Body */}
                      <p className="text-sm text-slate-700 mt-2.5 leading-relaxed whitespace-pre-line">
                        {review.comment}
                      </p>

                      {/* Owner Reply Section */}
                      {review.ownerReply ? (
                        <div className="mt-3 pl-3.5 border-l-2 border-blue-500 bg-slate-50/90 rounded-r-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs font-bold text-slate-800">
                                Response from {review.ownerReplyBy || 'Business Owner'}
                              </span>
                              {review.ownerReplyAt && (
                                <span className="text-[11px] text-slate-400 ml-1">
                                  {new Date(review.ownerReplyAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Owner edit/delete response options */}
                            {isOwnerOfThisWash && (
                              <div className="flex items-center gap-1">
                                <button
                                  id={`btn-edit-reply-${review.id}`}
                                  onClick={() => {
                                    setReplyingReviewId(review.id);
                                    setReplyText(review.ownerReply || '');
                                  }}
                                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline px-1"
                                >
                                  Edit
                                </button>
                                <button
                                  id={`btn-delete-reply-${review.id}`}
                                  onClick={() => handleDeleteReply(review.id)}
                                  className="text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:underline px-1"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">
                            {review.ownerReply}
                          </p>
                        </div>
                      ) : (
                        /* Owner Reply Button */
                        isOwnerOfThisWash && replyingReviewId !== review.id && (
                          <div className="mt-2.5">
                            <button
                              id={`btn-open-reply-${review.id}`}
                              onClick={() => {
                                setReplyingReviewId(review.id);
                                setReplyText('');
                              }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1 hover:underline"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" /> Reply to customer
                            </button>
                          </div>
                        )
                      )}

                      {/* Inline Reply Form for Owner */}
                      {isOwnerOfThisWash && replyingReviewId === review.id && (
                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-900">
                              Write response to {review.customerName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplyingReviewId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                          <textarea
                            id={`input-owner-reply-${review.id}`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value.slice(0, MAX_CHAR_LIMIT))}
                            placeholder="Thank the customer or address their feedback professionally..."
                            rows={2}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                          />
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>{replyText.length} / {MAX_CHAR_LIMIT}</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReplyingReviewId(null)}
                                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                id={`btn-submit-owner-reply-${review.id}`}
                                disabled={isSubmittingReply || !replyText.trim()}
                                onClick={() => handleSaveReply(review.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded font-medium text-xs hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isSubmittingReply ? 'Posting...' : 'Post Reply'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Autoshine Customer Review Protection</span>
          <button
            id="btn-close-reviews-modal-footer"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
