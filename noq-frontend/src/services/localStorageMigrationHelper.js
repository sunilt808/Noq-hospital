/**
 * localStorage to api Migration Helper
 * This provides drop-in replacements for common localStorage patterns
 * Used during refactoring phase to ease migration
 */

import { useAuth } from '../context/AuthContext';
import useApiData from './useF irebaseData';

/**
 * Replaces: const user = JSON.parse(localStorage.getItem('currentUser'))
 * Use:      const { currentUser } = useAuth()
 */
export const getCurrentUserFromAuth = (useAuthHook) => {
  const { currentUser } = useAuthHook ? useAuthHook() : { currentUser: null };
  return currentUser;
};

/**
 * Replaces: localStorage.setItem('key', JSON.stringify(data))
 * Use:      await apiDbService.upsert('collection', id, data)
 */
export const saveToapi = async (filebaseDbService, collection, id, data) => {
  return await filebaseDbService.upsert(collection, id, data);
};

/**
 * Replaces: JSON.parse(localStorage.getItem('doctors') || '[]')
 * Use:      Use useApiData hook's doctors array
 */
export const getapiCollection = (useApiDataHook, collectionName) => {
  const { [collectionName]: collection } = useApiDataHook ? useApiDataHook() : { [collectionName]: [] };
  return collection || [];
};

/**
 * Component migration pattern:
 * 
 * OLD:
 * const user = JSON.parse(localStorage.getItem('currentUser'));
 * const [doctors, setDoctors] = useState([]);
 * useEffect(() => {
 *   const docs = JSON.parse(localStorage.getItem('doctors') || '[]');
 *   setDoctors(docs);
 * }, []);
 *
 * NEW:
 * const { currentUser } = useAuth();
 * const { doctors } = useApiData();
 * // No useState needed - data comes from hook
 */

/**
 * For pages that need to create/update records:
 * 
 * OLD:
 * const handleSave = () => {
 *   const data = { id: 1, name: 'John' };
 *   const items = JSON.parse(localStorage.getItem('doctors') || '[]');
 *   items.push(data);
 *   localStorage.setItem('doctors', JSON.stringify(items));
 * };
 *
 * NEW:
 * const handleSave = async () => {
 *   const data = { id: 1, name: 'John' };
 *   await apiDbService.upsert('users', data.id, data);
 *   // Data auto-refreshes in useApiData hook
 * };
 */

export default {
  getCurrentUserFromAuth,
  saveToapi,
  getapiCollection,
};
