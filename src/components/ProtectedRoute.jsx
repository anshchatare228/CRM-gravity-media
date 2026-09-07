import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setSession(session);
            setLoading(false);
        };

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;