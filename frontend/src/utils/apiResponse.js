export const normalizeApiResponse = (response) => { 
  return { 
    data: response?.data || [], 
    pagination: response?.pagination || {}, 
    meta: response?.meta || {}, 
    errors: response?.errors || [] 
  };
};
