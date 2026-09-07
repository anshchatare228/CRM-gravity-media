import { useState } from "react";
import { useNavigate } from "react-router-dom";
import brandLogo from "../assets/logo.png";
import { supabase } from "../lib/supabase";

function Login({ onAuthSuccess }) {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!formData.email || !formData.password) {
            return "Please fill all required fields";
        }

        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                setError("Invalid email or password");
                return;
            }

            if (!data.user) {
                setError("Unable to authenticate user");
                return;
            }

            /*
             * Supabase automatically stores the authenticated
             * session in the browser.
             */

            if (onAuthSuccess) {
                onAuthSuccess(data.session, data.user);
            }

            navigate("/dashboard");

        } catch (err) {
            console.error(err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-300">

            {/* NAVBAR */}
            <div className="flex items-center justify-between bg-neutral-50 px-6 py-4 shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3 ml-[-13px] md:ml-0">
                    <img
                        src={brandLogo}
                        alt="Brand"
                        className="h-13 w-auto object-contain"
                    />
                </div>
            </div>

            {/* LOGIN CARD */}
            <div className="flex flex-col min-h-[85vh] items-center justify-center px-4">

                <h1 className="mt-3 text-[3rem] mt-[-2rem] md:mt-0 font-bold">
                    Welcome Back
                </h1>

                <div className="mx-auto mt-5 max-w-[320px] md:min-w-[30rem] rounded-4xl bg-white p-8 drop-shadow-2xl border-[2px] border-green-600/60">

                    <span className="text-[1.6rem] md:text-[1.8rem] font-sans font-bold tracking-widest text-green-600 self-center">
                        Please login
                    </span>

                    <p className="mt-2 text-sm text-gray-500">
                        Login to manage your earnings, payouts and clients.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-8 mb-8 space-y-6"
                    >

                        {/* EMAIL */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Email Address
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full border-b-2 border-black/20 py-3 text-sm outline-none transition duration-500 focus:border-green-600"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="relative">

                            <label className="mb-2 block text-sm font-medium">
                                Password
                            </label>

                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full border-b-2 border-black/20 py-3 pr-16 text-sm outline-none transition duration-500 focus:border-green-600"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 top-[42px] text-xs text-gray-500"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>

                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {/* LOGIN BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-gradient-to-r from-black to-black/90 px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? "Logging In..." : "Login"}
                        </button>

                    </form>

                </div>
            </div>
        </div>
    );
}

export default Login;