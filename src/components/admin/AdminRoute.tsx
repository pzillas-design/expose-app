import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
    children: ReactNode;
    userProfile: any;
}

/**
 * Protected route wrapper for admin-only pages
 * Redirects to /projects if user is not an admin
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children, userProfile }) => {
    // Double-check: only allow if role is explicitly 'admin'
    if (!userProfile || userProfile.role !== 'admin') {
        console.warn('[Security] Unauthorized admin access attempt blocked');
        return <Navigate to="/projects" replace />;
    }

    return <>{children}</>;
};
