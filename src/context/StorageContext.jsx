import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase-config';

export const useStorage = () => {
    return useContext(StorageContext);
};

export const StorageProvider = ({ children, accountId }) => {
    const [templates, setTemplates] = useState([]);
    const [members, setMembers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load all data with real-time listeners
    useEffect(() => {
        if (!accountId) return;

        setLoading(true);

        // Templates Listener
        const qTemplates = query(collection(db, 'templates'), where('accountId', '==', accountId), orderBy('createdAt', 'desc'));
        const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
            const t = [];
            snapshot.forEach((doc) => t.push({ id: doc.id, ...doc.data() }));
            setTemplates(t);
            setLoading(false);
        }, (err) => {
            console.error('Templates listener error:', err);
            setLoading(false);
        });

        // Members Listener
        const qMembers = query(collection(db, 'members'), where('accountId', '==', accountId), orderBy('name', 'asc'));
        const unsubMembers = onSnapshot(qMembers, (snapshot) => {
            const m = [];
            snapshot.forEach((doc) => m.push({ id: doc.id, ...doc.data() }));
            setMembers(m);
        });

        // Services Listener
        const qServices = query(collection(db, 'services'), where('accountId', '==', accountId), orderBy('serviceDate', 'asc'));
        const unsubServices = onSnapshot(qServices, (snapshot) => {
            const s = [];
            snapshot.forEach((doc) => s.push({ id: doc.id, ...doc.data() }));
            setServices(s);
        });

        return () => {
            unsubTemplates();
            unsubMembers();
            unsubServices();
        };
    }, [accountId]);

    // ── Template Actions ──────────────────────────────────────────────────────

    const addTemplate = async (name, customFields = []) => {
        try {
            await addDoc(collection(db, 'templates'), {
                accountId,
                name,
                customFields,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to add template:', err);
        }
    };

    const updateTemplate = async (id, updatedData) => {
        try {
            await updateDoc(doc(db, 'templates', id), updatedData);
        } catch (err) {
            console.error('Failed to update template:', err);
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await deleteDoc(doc(db, 'templates', id));
            // Cleanup cascade for Firestore (manual cleanup needed unlike some SQL triggers)
            const mQuery = query(collection(db, 'members'), where('templateId', '==', id));
            const mSnap = await getDocs(mQuery);
            mSnap.forEach(async (mDoc) => await deleteDoc(doc(db, 'members', mDoc.id)));

            const sQuery = query(collection(db, 'services'), where('templateId', '==', id));
            const sSnap = await getDocs(sQuery);
            sSnap.forEach(async (sDoc) => await deleteDoc(doc(db, 'services', sDoc.id)));
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    };

    // ── Member Actions ────────────────────────────────────────────────────────

    const addMember = async (templateId, memberData) => {
        try {
            await addDoc(collection(db, 'members'), {
                templateId,
                accountId,
                ...memberData,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to add member:', err);
        }
    };

    const updateMember = async (id, updatedData) => {
        try {
            await updateDoc(doc(db, 'members', id), updatedData);
        } catch (err) {
            console.error('Failed to update member:', err);
        }
    };

    const deleteMember = async (id) => {
        try {
            await deleteDoc(doc(db, 'members', id));
            const sQuery = query(collection(db, 'services'), where('memberId', '==', id));
            const sSnap = await getDocs(sQuery);
            sSnap.forEach(async (sDoc) => await deleteDoc(doc(db, 'services', sDoc.id)));
        } catch (err) {
            console.error('Failed to delete member:', err);
        }
    };

    // ── Service Actions ───────────────────────────────────────────────────────

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '') => {
        try {
            await addDoc(collection(db, 'services'), {
                templateId,
                memberId,
                accountId,
                memberName,
                serviceDate,
                serviceType,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to add service:', err);
        }
    };

    const updateService = async (id, updatedData) => {
        try {
            await updateDoc(doc(db, 'services', id), updatedData);
        } catch (err) {
            console.error('Failed to update service:', err);
        }
    };

    const deleteService = async (id) => {
        try {
            await deleteDoc(doc(db, 'services', id));
        } catch (err) {
            console.error('Failed to delete service:', err);
        }
    };

    const value = {
        templates,
        members,
        services,
        loading,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        addMember,
        updateMember,
        deleteMember,
        addService,
        updateService,
        deleteService
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};
