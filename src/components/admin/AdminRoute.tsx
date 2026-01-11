import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
    children: ReactNode;
    user: any;
    userProfile: any;
}

/**
 * Protected route wrapper for admin-only pages
 * Redirects to /projects if user is not an admin
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children, user, userProfile }) => {
    // 1. If we have a user session but the profile is still loading, show a loading state
    if (user && !userProfile) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    // 2. If no user session exists or role is not admin, redirect
    if (!user || userProfile?.role !== 'admin') {
        console.warn('[Security] Unauthorized admin access attempt blocked');
        return <Navigate to="/projects" replace />;
    }

    // 3. User is authenticated and is an admin
    return <>{children}</>;
};
