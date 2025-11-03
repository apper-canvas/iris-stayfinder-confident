import { toast } from "react-toastify";
import React, { useEffect, useState } from "react";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";

// Mock review data - in production this would come from a database
const mockReviews = [
  {
    Id: 1,
    propertyId: 1,
    userId: 'u1',
    userName: "Sarah M.",
    userAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    title: "Amazing property with stunning views!",
    comment: "Amazing property with stunning views! The host was incredibly responsive and the location was perfect for exploring the city. Would definitely stay again.",
    date: "2024-12-15T10:30:00Z",
    verified: true,
    helpful: 8
  },
  {
    Id: 2,
    propertyId: 1,
    userId: 'u2',
    userName: "James L.",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    title: "Clean and comfortable",
    comment: "Clean, comfortable, and exactly as described. Great amenities and the neighborhood felt very safe. Easy check-in process too.",
    date: "2024-11-28T14:15:00Z",
    verified: true,
    helpful: 12
  },
  {
    Id: 3,
    propertyId: 1,
    userId: 'u3',
    userName: "Maria K.",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    title: "Lovely place with great attention to detail",
    comment: "Lovely place with great attention to detail. Minor issue with WiFi but host resolved it quickly. Overall excellent experience!",
    date: "2024-10-22T16:45:00Z",
    verified: true,
    helpful: 6
  },
  {
    Id: 4,
    propertyId: 1,
    userId: 'u4',
    userName: "David R.",
    userAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    title: "Exceeded expectations!",
    comment: "Exceeded expectations! Beautiful space, perfect location, and the host provided excellent local recommendations. Highly recommend.",
    date: "2024-10-18T09:20:00Z",
    verified: true,
    helpful: 15
  },
  {
    Id: 5,
    propertyId: 1,
    userId: 'u5',
    userName: "Emma T.",
    userAvatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    title: "Great value for money",
    comment: "Great value for money. The apartment was spotless and had everything we needed. Would stay here again on our next visit.",
    date: "2024-09-30T11:10:00Z",
    verified: true,
    helpful: 9
  },
  {
    Id: 6,
    propertyId: 1,
    userId: 'u6',
    userName: "Alex P.",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    title: "Perfect for our weekend getaway",
    comment: "Perfect for our weekend getaway. The photos don't do it justice - it's even better in person! Great communication from the host.",
    date: "2024-09-15T13:30:00Z",
    verified: true,
    helpful: 11
  }
];

class ReviewService {
  constructor() {
    // Initialize ApperClient for database operations
    this.apperClient = null;
    this.initializeClient();
  }

  initializeClient() {
    if (typeof window !== 'undefined' && window.ApperSDK) {
      const { ApperClient } = window.ApperSDK;
      this.apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });
    }
  }

  async getByPropertyId(propertyId, options = {}) {
    try {
      if (!this.apperClient) this.initializeClient();

      const params = {
        fields: [
          {"field": {"Name": "Id"}},
          {"field": {"Name": "Name"}},
          {"field": {"Name": "property_id_c"}},
          {"field": {"Name": "user_id_c"}},
          {"field": {"Name": "user_name_c"}},
          {"field": {"Name": "user_avatar_c"}},
          {"field": {"Name": "rating_c"}},
          {"field": {"Name": "title_c"}},
          {"field": {"Name": "comment_c"}},
          {"field": {"Name": "date_c"}},
          {"field": {"Name": "verified_c"}},
          {"field": {"Name": "helpful_c"}}
        ],
        where: [{"FieldName": "property_id_c", "Operator": "EqualTo", "Values": [parseInt(propertyId)]}],
        orderBy: [{"fieldName": "date_c", "sorttype": options.sortBy === 'rating' ? 'DESC' : 'DESC'}],
        pagingInfo: {"limit": 100, "offset": 0}
      };

      const response = await this.apperClient.fetchRecords('review_c', params);
      
      if (!response.success) {
        console.error("Error fetching reviews:", response.message);
        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0
        };
      }

      if (!response.data?.length) {
        return {
          reviews: [],
          totalCount: 0,
          averageRating: 0
        };
      }

      // Transform database fields to frontend format
      const reviews = response.data.map(this.transformFromDatabase);

      // Sort reviews based on options
      const sortBy = options.sortBy || 'date';
      const sortOrder = options.sortOrder || 'desc';
      
      reviews.sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else if (sortBy === 'rating') {
          return sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
        } else if (sortBy === 'helpful') {
          return sortOrder === 'desc' ? b.helpful - a.helpful : a.helpful - b.helpful;
        }
        return 0;
      });

      return {
        reviews: reviews,
        totalCount: reviews.length,
        averageRating: this._calculateAverageRating(reviews)
      };
    } catch (error) {
      console.error("Error fetching reviews:", error?.response?.data?.message || error);
      return {
        reviews: [],
        totalCount: 0,
        averageRating: 0
      };
    }
  }

  async getReviewsSummary(propertyId) {
    const result = await this.getByPropertyId(propertyId);
    return result;
  }

  async create(reviewData) {
    try {
      if (!this.apperClient) this.initializeClient();

      // Validate required fields
      if (!reviewData.propertyId || !reviewData.rating || !reviewData.comment) {
        throw new Error('Property ID, rating, and comment are required');
      }

      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5 stars');
      }

      if (reviewData.comment.length < 10) {
        throw new Error('Review comment must be at least 10 characters long');
      }

      if (reviewData.comment.length > 1000) {
        throw new Error('Review comment must be less than 1000 characters');
      }

      // Transform frontend format to database fields (only updateable fields)
      const dbData = this.transformToDatabase(reviewData, true);

      const params = {
        records: [dbData]
      };

      const response = await this.apperClient.createRecord('review_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        throw new Error(response.message);
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to create review:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
          throw new Error('Failed to create review');
        }
        
        if (successful.length > 0) {
          return this.transformFromDatabase(successful[0].data);
        }
      }

      throw new Error('No successful results returned');
    } catch (error) {
      console.error("Error creating review:", error?.response?.data?.message || error);
      throw error;
    }
  }

  async update(id, reviewData) {
    try {
      if (!this.apperClient) this.initializeClient();

      // Validate fields if they're being updated
      if (reviewData.rating !== undefined && (reviewData.rating < 1 || reviewData.rating > 5)) {
        throw new Error('Rating must be between 1 and 5 stars');
      }

      if (reviewData.comment !== undefined) {
        if (reviewData.comment.length < 10) {
          throw new Error('Review comment must be at least 10 characters long');
        }
        if (reviewData.comment.length > 1000) {
          throw new Error('Review comment must be less than 1000 characters');
        }
      }

      // Transform frontend format to database fields (only updateable fields)
      const dbData = {
        Id: parseInt(id),
        ...this.transformToDatabase(reviewData, true)
      };

      const params = {
        records: [dbData]
      };

      const response = await this.apperClient.updateRecord('review_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        throw new Error(response.message);
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to update review:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
          throw new Error('Failed to update review');
        }
        
        if (successful.length > 0) {
          return this.transformFromDatabase(successful[0].data);
        }
      }

      throw new Error('No successful results returned');
    } catch (error) {
      console.error("Error updating review:", error?.response?.data?.message || error);
      throw error;
    }
  }

  async delete(id) {
    try {
      if (!this.apperClient) this.initializeClient();

      const params = { 
        RecordIds: [parseInt(id)]
      };

      const response = await this.apperClient.deleteRecord('review_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        throw new Error(response.message);
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to delete review:`, failed);
          failed.forEach(record => {
            if (record.message) toast.error(record.message);
          });
          throw new Error('Failed to delete review');
        }
        
        if (successful.length > 0) {
          return true;
        }
      }

      throw new Error('No successful results returned');
    } catch (error) {
      console.error("Error deleting review:", error?.response?.data?.message || error);
      throw error;
    }
  }

  // Calculate average rating for a set of reviews
  _calculateAverageRating(reviews) {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  // Transform database format to frontend format
  transformFromDatabase(dbRecord) {
    return {
      Id: dbRecord.Id,
      propertyId: dbRecord.property_id_c || 0,
      userId: dbRecord.user_id_c || '',
      userName: dbRecord.user_name_c || 'Anonymous User',
      userAvatar: dbRecord.user_avatar_c || '',
      rating: dbRecord.rating_c || 0,
      title: dbRecord.title_c || '',
      comment: dbRecord.comment_c || '',
      date: dbRecord.date_c || new Date().toISOString(),
      verified: dbRecord.verified_c || false,
      helpful: dbRecord.helpful_c || 0
    };
  }

  // Transform frontend format to database format
  transformToDatabase(frontendData, onlyUpdateable = false) {
    const dbData = {};

    // Only include updateable fields for create/update operations
    if (frontendData.propertyId !== undefined) dbData.property_id_c = parseInt(frontendData.propertyId);
    if (frontendData.userId !== undefined) dbData.user_id_c = frontendData.userId;
    if (frontendData.userName !== undefined) dbData.user_name_c = frontendData.userName;
    if (frontendData.userAvatar !== undefined) dbData.user_avatar_c = frontendData.userAvatar;
    if (frontendData.rating !== undefined) dbData.rating_c = parseInt(frontendData.rating);
    if (frontendData.title !== undefined) dbData.title_c = frontendData.title;
    if (frontendData.comment !== undefined) dbData.comment_c = frontendData.comment;
    if (frontendData.date !== undefined) dbData.date_c = frontendData.date;
    if (frontendData.verified !== undefined) dbData.verified_c = frontendData.verified;
    if (frontendData.helpful !== undefined) dbData.helpful_c = parseInt(frontendData.helpful);

    // Set default date if not provided for create operations
    if (!dbData.date_c && !onlyUpdateable) {
      dbData.date_c = new Date().toISOString();
    }

    return dbData;
  }
}

export const reviewService = new ReviewService();

// Review Form Component

function ReviewForm({ propertyId, onSubmit, onCancel, loading }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }
    
    if (comment.trim().length < 10) {
      newErrors.comment = 'Review must be at least 10 characters long';
    }
    
    if (comment.trim().length > 1000) {
      newErrors.comment = 'Review must be less than 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const reviewData = {
      propertyId: propertyId,
      rating: rating,
      title: title.trim(),
      comment: comment.trim(),
      userId: 'current-user', // In real app, get from auth
      userName: 'Current User', // In real app, get from auth
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    };

    await onSubmit(reviewData);
  };

  const handleRatingClick = (value) => {
    setRating(value);
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
    if (errors.comment) {
      setErrors(prev => ({ ...prev, comment: '' }));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-card p-6 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Your Review</h3>
      
      <form onSubmit={handleSubmit}>
        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-colors"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => handleRatingClick(star)}
              >
                <ApperIcon
                  name="Star"
                  size={24}
                  className={`${
                    star <= (hoveredRating || rating)
                      ? 'text-accent fill-current'
                      : 'text-gray-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {errors.rating && (
            <p className="text-error text-sm mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your review a title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            maxLength="100"
          />
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Comment *
          </label>
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Share your experience with this property..."
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors resize-none"
            maxLength="1000"
          />
          <div className="flex justify-between items-center mt-1">
            <div>
              {errors.comment && (
                <p className="text-error text-sm">{errors.comment}</p>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {comment.length}/1000
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <ApperIcon name="Loader2" size={16} className="animate-spin" />
                Submitting...
              </div>
            ) : (
              'Submit Review'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// Enhanced Reviews Section Component
function ReviewsSection({ rating, reviewCount, propertyId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddReview, setShowAddReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const reviewData = await reviewService.getReviewsSummary(propertyId);
      setReviews(reviewData.reviews);
    } catch (err) {
      setError('Failed to load reviews');
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      setSubmittingReview(true);
      await reviewService.create(reviewData);
      toast.success('Review submitted successfully!');
      setShowAddReview(false);
      await loadReviews(); // Refresh reviews
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  React.useEffect(() => {
    if (propertyId) {
      loadReviews();
    }
  }, [propertyId]);

  if (loading) {
    return (
      <div className="mt-12">
        <div className="flex items-center justify-center py-12">
          <ApperIcon name="Loader2" size={32} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12">
        <div className="text-center py-12">
          <ApperIcon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Reviews ({reviewCount || reviews.length})
          </h2>
          {rating && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <ApperIcon
                    key={star}
                    name="Star"
                    size={16}
                    className={`${
                      star <= Math.round(rating) 
                        ? 'text-accent fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{rating} average</span>
            </div>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAddReview(!showAddReview)}
          className="flex items-center gap-2"
        >
          <ApperIcon name="Plus" size={16} />
          Add Review
        </Button>
      </div>

      {showAddReview && (
        <ReviewForm
          propertyId={propertyId}
          onSubmit={handleSubmitReview}
          onCancel={() => setShowAddReview(false)}
          loading={submittingReview}
        />
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-card">
          <ApperIcon name="MessageCircle" size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No reviews yet. Be the first to review this property!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.Id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start gap-4">
                <img
                  src={review.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'}
                  alt={review.userName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <ApperIcon
                              key={star}
                              name="Star"
                              size={14}
                              className={`${
                                star <= review.rating 
                                  ? 'text-accent fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(review.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                            <ApperIcon name="CheckCircle" size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {review.title && (
                    <h5 className="font-medium text-gray-900 mt-3">{review.title}</h5>
                  )}
                  
                  <p className="text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      <ApperIcon name="ThumbsUp" size={14} />
                      <span>Helpful ({review.helpful})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { ReviewForm, ReviewsSection };