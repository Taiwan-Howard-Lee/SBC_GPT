import React, { useState } from 'react';
import './FeedbackModal.css';

interface FeedbackModalProps {
  onSubmit: (rating: number, comments: string) => Promise<void>;
  onSkip: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onSubmit, onSkip }) => {
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(rating, comments);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error('Error submitting feedback:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h2>How was this conversation?</h2>
        </div>

        <div className="feedback-modal-body">
          <p>Your feedback helps us improve our AI assistant.</p>

          <div className="rating-container">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className={`star-button ${rating >= star ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                >
                  <i className="fas fa-star"></i>
                </button>
              ))}
            </div>
            <div className="rating-label">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </div>
          </div>

          <div className="comments-container">
            <label htmlFor="feedback-comments">Additional comments (optional)</label>
            <textarea
              id="feedback-comments"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Tell us what worked well or how we could improve..."
              rows={4}
            />
          </div>

          {error && <div className="feedback-error">{error}</div>}
        </div>

        <div className="feedback-modal-footer">
          <button
            className="skip-button"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
