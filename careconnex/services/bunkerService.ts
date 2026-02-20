import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Bunker API configuration
const BUNKER_API_KEY = import.meta.env.VITE_BUNKER_API_KEY || '';
const BUNKER_API_URL = 'https://api.getbunker.com/v1'; // Example URL - replace with actual

export interface InsuranceQuote {
    quoteId: string;
    premium: number;
    coverage: {
        liability: number;
        injury: number;
    };
    duration: string;
    validUntil: string;
}

export interface InsurancePolicy {
    policyId: string;
    policyNumber: string;
    certificateUrl: string;
    premium: number;
    coverage: {
        liability: number;
        injury: number;
    };
    startDate: string;
    endDate: string;
    status: 'active' | 'expired' | 'cancelled';
}

export const bunkerService = {
    /**
     * Get real-time insurance quote for an appointment
     */
    async getQuote(appointmentDetails: {
        date: string;
        duration: number; // in hours
        caregiverName: string;
        clientName: string;
        location: string;
    }): Promise<InsuranceQuote> {
        try {
            // If no API key, return mock quote
            if (!BUNKER_API_KEY) {
                console.warn('Bunker API key not configured, returning mock quote');
                return {
                    quoteId: `MOCK-${Date.now()}`,
                    premium: 5.99,
                    coverage: {
                        liability: 1000000,
                        injury: 100000,
                    },
                    duration: `${appointmentDetails.duration} hours`,
                    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                };
            }

            // Real API call
            const response = await fetch(`${BUNKER_API_URL}/quotes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BUNKER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_type: 'home_care',
                    duration_hours: appointmentDetails.duration,
                    service_date: appointmentDetails.date,
                    location: appointmentDetails.location,
                }),
            });

            if (!response.ok) {
                throw new Error(`Bunker API error: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                quoteId: data.quote_id,
                premium: data.premium,
                coverage: {
                    liability: data.coverage.general_liability,
                    injury: data.coverage.bodily_injury,
                },
                duration: `${appointmentDetails.duration} hours`,
                validUntil: data.valid_until,
            };
        } catch (error) {
            console.error('Error getting insurance quote:', error);
            throw new Error('Unable to get insurance quote. Please try again.');
        }
    },

    /**
     * Purchase insurance policy
     */
    async purchasePolicy(
        quoteId: string,
        appointmentId: string,
        paymentMethodId: string
    ): Promise<InsurancePolicy> {
        try {
            // If no API key, return mock policy
            if (!BUNKER_API_KEY) {
                console.warn('Bunker API key not configured, returning mock policy');
                const mockPolicy: InsurancePolicy = {
                    policyId: `MOCK-POL-${Date.now()}`,
                    policyNumber: `CC-${Date.now().toString().slice(-8)}`,
                    certificateUrl: 'https://example.com/certificate.pdf',
                    premium: 5.99,
                    coverage: {
                        liability: 1000000,
                        injury: 100000,
                    },
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                };

                // Store mock policy in Firestore
                await addDoc(collection(db, 'insurance_policies'), {
                    ...mockPolicy,
                    appointmentId,
                    createdAt: new Date().toISOString(),
                });

                return mockPolicy;
            }

            // Real API call
            const response = await fetch(`${BUNKER_API_URL}/policies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BUNKER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quote_id: quoteId,
                    payment_method: paymentMethodId,
                    metadata: {
                        appointment_id: appointmentId,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Bunker API error: ${response.statusText}`);
            }

            const data = await response.json();

            const policy: InsurancePolicy = {
                policyId: data.policy_id,
                policyNumber: data.policy_number,
                certificateUrl: data.certificate_url,
                premium: data.premium,
                coverage: {
                    liability: data.coverage.general_liability,
                    injury: data.coverage.bodily_injury,
                },
                startDate: data.start_date,
                endDate: data.end_date,
                status: data.status,
            };

            // Store policy in Firestore
            await addDoc(collection(db, 'insurance_policies'), {
                ...policy,
                appointmentId,
                createdAt: new Date().toISOString(),
            });

            return policy;
        } catch (error) {
            console.error('Error purchasing insurance policy:', error);
            throw new Error('Unable to purchase insurance. Please try again.');
        }
    },

    /**
     * Get policy details
     */
    async getPolicy(policyId: string): Promise<InsurancePolicy | null> {
        try {
            // Check Firestore first
            const policiesSnapshot = await getDocs(
                query(collection(db, 'insurance_policies'), where('policyId', '==', policyId))
            );

            if (!policiesSnapshot.empty) {
                const policyDoc = policiesSnapshot.docs[0];
                return policyDoc.data() as InsurancePolicy;
            }

            // If not in Firestore and we have API key, fetch from Bunker
            if (BUNKER_API_KEY) {
                const response = await fetch(`${BUNKER_API_URL}/policies/${policyId}`, {
                    headers: {
                        'Authorization': `Bearer ${BUNKER_API_KEY}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        policyId: data.policy_id,
                        policyNumber: data.policy_number,
                        certificateUrl: data.certificate_url,
                        premium: data.premium,
                        coverage: {
                            liability: data.coverage.general_liability,
                            injury: data.coverage.bodily_injury,
                        },
                        startDate: data.start_date,
                        endDate: data.end_date,
                        status: data.status,
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting policy:', error);
            return null;
        }
    },

    /**
     * Get all policies for a user
     */
    async getUserPolicies(userId: string): Promise<InsurancePolicy[]> {
        try {
            // Get all appointments for user
            const appointmentsSnapshot = await getDocs(
                query(collection(db, 'appointments'), where('clientId', '==', userId))
            );

            const appointmentIds = appointmentsSnapshot.docs.map(doc => doc.id);

            if (appointmentIds.length === 0) {
                return [];
            }

            // Get policies for these appointments
            const policiesSnapshot = await getDocs(
                query(collection(db, 'insurance_policies'), where('appointmentId', 'in', appointmentIds))
            );

            return policiesSnapshot.docs.map(doc => doc.data() as InsurancePolicy);
        } catch (error) {
            console.error('Error getting user policies:', error);
            return [];
        }
    },
};
