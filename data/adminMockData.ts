
import { AdminUser, AdminJob } from '../types';

export const MOCK_USERS: AdminUser[] = [
    {
        id: 'u-1',
        name: 'Michael Pzillas',
        email: 'pzillas@gmail.com',
        role: 'admin',
        status: 'active',
        credits: 950.00,
        totalSpent: 1250.50,
        joinedAt: Date.now() - 100000000,
        lastActiveAt: Date.now() - 5000
    },
    {
        id: 'u-2',
        name: 'Sarah Design',
        email: 'sarah.d@studio.com',
        role: 'pro',
        status: 'active',
        credits: 45.50,
        totalSpent: 320.00,
        joinedAt: Date.now() - 50000000,
        lastActiveAt: Date.now() - 3600000
    },
    {
        id: 'u-3',
        name: 'John Doe',
        email: 'john.doe@test.com',
        role: 'user',
        status: 'active',
        credits: 2.00,
        totalSpent: 15.00,
        joinedAt: Date.now() - 2000000,
        lastActiveAt: Date.now() - 86400000
    },
    {
        id: 'u-4',
        name: 'Bot User 01',
        email: 'bot@spam.net',
        role: 'user',
        status: 'suspended',
        credits: 0.00,
        totalSpent: 0.00,
        joinedAt: Date.now() - 1000000,
        lastActiveAt: Date.now() - 90000000
    }
];

export const MOCK_JOBS: AdminJob[] = [
    {
        id: 'j-1023',
        userId: 'u-1',
        userName: 'Michael Pzillas',
        type: 'edit',
        model: 'gemini-3-pro-image-preview',
        status: 'completed',
        cost: 1.00,
        durationMs: 4500,
        createdAt: Date.now() - 120000,
        promptPreview: 'Make the room modern with leather sofa...'
    },
    {
        id: 'j-1022',
        userId: 'u-2',
        userName: 'Sarah Design',
        type: 'generate',
        model: 'gemini-2.5-flash-image',
        status: 'completed',
        cost: 0.50,
        durationMs: 2300,
        createdAt: Date.now() - 600000,
        promptPreview: 'Sunny garden with pool...'
    },
    {
        id: 'j-1021',
        userId: 'u-1',
        userName: 'Michael Pzillas',
        type: 'edit',
        model: 'gemini-3-pro-image-preview',
        status: 'failed',
        cost: 0.00,
        durationMs: 12000,
        createdAt: Date.now() - 3600000,
        promptPreview: 'Remove the wall...'
    },
    {
        id: 'j-1020',
        userId: 'u-3',
        userName: 'John Doe',
        type: 'generate',
        model: 'gemini-2.5-flash-image',
        status: 'completed',
        cost: 0.50,
        durationMs: 3100,
        createdAt: Date.now() - 7200000,
        promptPreview: 'Blue sky landscape...'
    },
    {
        id: 'j-1019',
        userId: 'u-2',
        userName: 'Sarah Design',
        type: 'edit',
        model: 'gemini-3-pro-image-preview',
        status: 'processing',
        cost: 1.00,
        durationMs: 0,
        createdAt: Date.now() - 5000,
        promptPreview: 'Virtual staging bedroom...'
    }
];