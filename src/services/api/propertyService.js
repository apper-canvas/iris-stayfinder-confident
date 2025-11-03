import { toast } from "react-toastify";

class PropertyService {
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

  async getAll(options = {}) {
    try {
      if (!this.apperClient) this.initializeClient();
      
      const params = {
        fields: [
          {"field": {"Name": "Id"}},
          {"field": {"Name": "Name"}},
          {"field": {"Name": "title_c"}},
          {"field": {"Name": "description_c"}},
          {"field": {"Name": "property_type_c"}},
          {"field": {"Name": "location_address_c"}},
          {"field": {"Name": "location_city_c"}},
          {"field": {"Name": "location_country_c"}},
          {"field": {"Name": "location_coordinates_lat_c"}},
          {"field": {"Name": "location_coordinates_lng_c"}},
          {"field": {"Name": "pricing_nightly_rate_c"}},
          {"field": {"Name": "pricing_cleaning_fee_c"}},
          {"field": {"Name": "pricing_service_fee_c"}},
          {"field": {"Name": "pricing_currency_c"}},
          {"field": {"Name": "capacity_guests_c"}},
          {"field": {"Name": "capacity_bedrooms_c"}},
          {"field": {"Name": "capacity_beds_c"}},
          {"field": {"Name": "capacity_bathrooms_c"}},
          {"field": {"Name": "images_c"}},
          {"field": {"Name": "amenities_c"}},
          {"field": {"Name": "rating_c"}},
          {"field": {"Name": "review_count_c"}},
          {"field": {"Name": "host_id_c"}},
          {"field": {"Name": "host_name_c"}},
          {"field": {"Name": "host_avatar_c"}},
          {"field": {"Name": "host_join_date_c"}},
          {"field": {"Name": "host_verified_c"}},
          {"field": {"Name": "availability_min_stay_c"}},
          {"field": {"Name": "availability_max_stay_c"}}
        ],
        orderBy: [{"fieldName": "Id", "sorttype": "ASC"}],
        pagingInfo: {"limit": 50, "offset": 0}
      };

      const response = await this.apperClient.fetchRecords('property_c', params);
      
      if (!response.success) {
        console.error("Error fetching properties:", response.message);
        toast.error(response.message);
        return [];
      }

      if (!response.data?.length) {
        return [];
      }

      // Transform database fields to frontend format
      return response.data.map(this.transformFromDatabase);
    } catch (error) {
      console.error("Error fetching properties:", error?.response?.data?.message || error);
      return [];
    }
  }

  async getById(id) {
    try {
      if (!this.apperClient) this.initializeClient();

      const params = {
        fields: [
          {"field": {"Name": "Id"}},
          {"field": {"Name": "Name"}},
          {"field": {"Name": "title_c"}},
          {"field": {"Name": "description_c"}},
          {"field": {"Name": "property_type_c"}},
          {"field": {"Name": "location_address_c"}},
          {"field": {"Name": "location_city_c"}},
          {"field": {"Name": "location_country_c"}},
          {"field": {"Name": "location_coordinates_lat_c"}},
          {"field": {"Name": "location_coordinates_lng_c"}},
          {"field": {"Name": "pricing_nightly_rate_c"}},
          {"field": {"Name": "pricing_cleaning_fee_c"}},
          {"field": {"Name": "pricing_service_fee_c"}},
          {"field": {"Name": "pricing_currency_c"}},
          {"field": {"Name": "capacity_guests_c"}},
          {"field": {"Name": "capacity_bedrooms_c"}},
          {"field": {"Name": "capacity_beds_c"}},
          {"field": {"Name": "capacity_bathrooms_c"}},
          {"field": {"Name": "images_c"}},
          {"field": {"Name": "amenities_c"}},
          {"field": {"Name": "rating_c"}},
          {"field": {"Name": "review_count_c"}},
          {"field": {"Name": "host_id_c"}},
          {"field": {"Name": "host_name_c"}},
          {"field": {"Name": "host_avatar_c"}},
          {"field": {"Name": "host_join_date_c"}},
          {"field": {"Name": "host_verified_c"}},
          {"field": {"Name": "availability_min_stay_c"}},
          {"field": {"Name": "availability_max_stay_c"}}
        ]
      };

      const response = await this.apperClient.getRecordById('property_c', parseInt(id), params);
      
      if (!response.success) {
        console.error("Error fetching property:", response.message);
        return null;
      }

      if (!response.data) {
        return null;
      }

      // Transform database fields to frontend format
      const property = this.transformFromDatabase(response.data);

      // Get review data for this property
      try {
        const { reviewService } = await import('@/services/api/reviewService');
        const reviewData = await reviewService.getByPropertyId(id);
        
        return {
          ...property,
          rating: reviewData.averageRating || property.rating,
          reviewCount: reviewData.totalCount || property.reviewCount
        };
      } catch (error) {
        console.warn('Failed to load review data:', error);
        return property;
      }
    } catch (error) {
      console.error("Error fetching property:", error?.response?.data?.message || error);
      return null;
    }
  }

  async search(query) {
    try {
      const properties = await this.getAll();
      let results = [...properties];

      if (query.location) {
        const location = query.location.toLowerCase();
        results = results.filter(property =>
          property.location.city.toLowerCase().includes(location) ||
          property.location.country.toLowerCase().includes(location) ||
          property.title.toLowerCase().includes(location)
        );
      }

      if (query.guests && query.guests > 1) {
        results = results.filter(property =>
          property.capacity.guests >= query.guests
        );
      }

      if (query.priceRange) {
        results = results.filter(property =>
          property.pricing.nightlyRate >= query.priceRange.min &&
          property.pricing.nightlyRate <= query.priceRange.max
        );
      }

      if (query.propertyTypes && query.propertyTypes.length > 0) {
        results = results.filter(property =>
          query.propertyTypes.includes(property.propertyType)
        );
      }

      if (query.amenities && query.amenities.length > 0) {
        results = results.filter(property =>
          query.amenities.every(amenity =>
            property.amenities.includes(amenity)
          )
        );
      }

      return results;
    } catch (error) {
      console.error("Error searching properties:", error?.response?.data?.message || error);
      return [];
    }
  }

  async create(propertyData) {
    try {
      if (!this.apperClient) this.initializeClient();

      // Transform frontend format to database fields (only updateable fields)
      const dbData = this.transformToDatabase(propertyData, true);

      const params = {
        records: [dbData]
      };

      const response = await this.apperClient.createRecord('property_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return null;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to create property:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
        }
        
        if (successful.length > 0) {
          toast.success('Property created successfully');
          return this.transformFromDatabase(successful[0].data);
        }
      }

      return null;
    } catch (error) {
      console.error("Error creating property:", error?.response?.data?.message || error);
      toast.error("Failed to create property");
      return null;
    }
  }

  async update(id, updates) {
    try {
      if (!this.apperClient) this.initializeClient();

      // Transform frontend format to database fields (only updateable fields)
      const dbData = {
        Id: parseInt(id),
        ...this.transformToDatabase(updates, true)
      };

      const params = {
        records: [dbData]
      };

      const response = await this.apperClient.updateRecord('property_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return null;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to update property:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
        }
        
        if (successful.length > 0) {
          toast.success('Property updated successfully');
          return this.transformFromDatabase(successful[0].data);
        }
      }

      return null;
    } catch (error) {
      console.error("Error updating property:", error?.response?.data?.message || error);
      toast.error("Failed to update property");
      return null;
    }
  }

  async delete(id) {
    try {
      if (!this.apperClient) this.initializeClient();

      const params = { 
        RecordIds: [parseInt(id)]
      };

      const response = await this.apperClient.deleteRecord('property_c', params);
      
      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return false;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to delete property:`, failed);
          failed.forEach(record => {
            if (record.message) toast.error(record.message);
          });
        }
        
        if (successful.length > 0) {
          toast.success('Property deleted successfully');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error deleting property:", error?.response?.data?.message || error);
      toast.error("Failed to delete property");
      return false;
    }
  }

  // Transform database format to frontend format
  transformFromDatabase(dbRecord) {
    return {
      Id: dbRecord.Id,
      title: dbRecord.title_c || '',
      description: dbRecord.description_c || '',
      propertyType: dbRecord.property_type_c || '',
      location: {
        address: dbRecord.location_address_c || '',
        city: dbRecord.location_city_c || '',
        country: dbRecord.location_country_c || '',
        coordinates: {
          lat: dbRecord.location_coordinates_lat_c || 0,
          lng: dbRecord.location_coordinates_lng_c || 0
        }
      },
      pricing: {
        nightlyRate: dbRecord.pricing_nightly_rate_c || 0,
        cleaningFee: dbRecord.pricing_cleaning_fee_c || 0,
        serviceFee: dbRecord.pricing_service_fee_c || 0,
        currency: dbRecord.pricing_currency_c || 'USD'
      },
      capacity: {
        guests: dbRecord.capacity_guests_c || 0,
        bedrooms: dbRecord.capacity_bedrooms_c || 0,
        beds: dbRecord.capacity_beds_c || 0,
        bathrooms: dbRecord.capacity_bathrooms_c || 0
      },
      images: this.parseArrayField(dbRecord.images_c),
      amenities: this.parseArrayField(dbRecord.amenities_c),
      rating: dbRecord.rating_c || 0,
      reviewCount: dbRecord.review_count_c || 0,
      host: {
        id: dbRecord.host_id_c || '',
        name: dbRecord.host_name_c || '',
        avatar: dbRecord.host_avatar_c || '',
        joinDate: dbRecord.host_join_date_c || '',
        verified: dbRecord.host_verified_c || false,
        yearsHosting: 3,
        responseRate: '98%'
      },
      availability: {
        calendar: {},
        minStay: dbRecord.availability_min_stay_c || 1,
        maxStay: dbRecord.availability_max_stay_c || 30
      }
    };
  }

  // Transform frontend format to database format
  transformToDatabase(frontendData, onlyUpdateable = false) {
    const dbData = {};

    // Only include updateable fields for create/update operations
    if (frontendData.title !== undefined) dbData.title_c = frontendData.title;
    if (frontendData.description !== undefined) dbData.description_c = frontendData.description;
    if (frontendData.propertyType !== undefined) dbData.property_type_c = frontendData.propertyType;
    
    if (frontendData.location) {
      if (frontendData.location.address !== undefined) dbData.location_address_c = frontendData.location.address;
      if (frontendData.location.city !== undefined) dbData.location_city_c = frontendData.location.city;
      if (frontendData.location.country !== undefined) dbData.location_country_c = frontendData.location.country;
      if (frontendData.location.coordinates) {
        if (frontendData.location.coordinates.lat !== undefined) dbData.location_coordinates_lat_c = frontendData.location.coordinates.lat;
        if (frontendData.location.coordinates.lng !== undefined) dbData.location_coordinates_lng_c = frontendData.location.coordinates.lng;
      }
    }
    
    if (frontendData.pricing) {
      if (frontendData.pricing.nightlyRate !== undefined) dbData.pricing_nightly_rate_c = frontendData.pricing.nightlyRate;
      if (frontendData.pricing.cleaningFee !== undefined) dbData.pricing_cleaning_fee_c = frontendData.pricing.cleaningFee;
      if (frontendData.pricing.serviceFee !== undefined) dbData.pricing_service_fee_c = frontendData.pricing.serviceFee;
      if (frontendData.pricing.currency !== undefined) dbData.pricing_currency_c = frontendData.pricing.currency;
    }
    
    if (frontendData.capacity) {
      if (frontendData.capacity.guests !== undefined) dbData.capacity_guests_c = frontendData.capacity.guests;
      if (frontendData.capacity.bedrooms !== undefined) dbData.capacity_bedrooms_c = frontendData.capacity.bedrooms;
      if (frontendData.capacity.beds !== undefined) dbData.capacity_beds_c = frontendData.capacity.beds;
      if (frontendData.capacity.bathrooms !== undefined) dbData.capacity_bathrooms_c = frontendData.capacity.bathrooms;
    }
    
    if (frontendData.images !== undefined) dbData.images_c = this.stringifyArrayField(frontendData.images);
    if (frontendData.amenities !== undefined) dbData.amenities_c = this.stringifyArrayField(frontendData.amenities);
    if (frontendData.rating !== undefined) dbData.rating_c = frontendData.rating;
    if (frontendData.reviewCount !== undefined) dbData.review_count_c = frontendData.reviewCount;
    
    if (frontendData.host) {
      if (frontendData.host.id !== undefined) dbData.host_id_c = frontendData.host.id;
      if (frontendData.host.name !== undefined) dbData.host_name_c = frontendData.host.name;
      if (frontendData.host.avatar !== undefined) dbData.host_avatar_c = frontendData.host.avatar;
      if (frontendData.host.joinDate !== undefined) dbData.host_join_date_c = frontendData.host.joinDate;
      if (frontendData.host.verified !== undefined) dbData.host_verified_c = frontendData.host.verified;
    }
    
    if (frontendData.availability) {
      if (frontendData.availability.minStay !== undefined) dbData.availability_min_stay_c = frontendData.availability.minStay;
      if (frontendData.availability.maxStay !== undefined) dbData.availability_max_stay_c = frontendData.availability.maxStay;
    }

    return dbData;
  }

  // Helper method to parse array fields stored as strings
  parseArrayField(fieldValue) {
    if (!fieldValue) return [];
    if (Array.isArray(fieldValue)) return fieldValue;
    try {
      return JSON.parse(fieldValue);
    } catch {
      return fieldValue.split(',').map(item => item.trim()).filter(Boolean);
    }
  }

  // Helper method to stringify array fields for database storage
  stringifyArrayField(arrayValue) {
    if (!arrayValue) return '';
    if (Array.isArray(arrayValue)) {
      return JSON.stringify(arrayValue);
    }
    return String(arrayValue);
  }
}

export const propertyService = new PropertyService();