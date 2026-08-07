import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAffiliate } from "../api/auth.api";
import brandLogo from "../assets/krazystore-logo.png";

// --- Demo ---
// import { DottedSurface } from "@/components/ui/dotted-surface";
// import { cn } from '@/lib/utils';

function Login({ onAuthSuccess }) {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [showPassword, setShowPassword] =
        useState(false);

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

        try {
            setError("");

            const validationError = validateForm();

            if (validationError) {
                setError(validationError);
                return;
            }

            setLoading(true);

            const data = await loginAffiliate(formData);

            if (!data.success) {
                setError(data.message || "Login failed");
                return;
            }

            if (onAuthSuccess) {
                onAuthSuccess(data.token, data.affiliate);
            } else {
                localStorage.setItem(
                    "affiliate_token",
                    data.token
                );

                localStorage.setItem(
                    "affiliate_user",
                    JSON.stringify(data.affiliate)
                );
            }

            navigate("/dashboard");

        } catch (err) {
            console.log(err);

            setError(
                err.response?.data?.message ||
                "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* <DottedSurface className="size-full">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
                            'bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.1),transparent_50%)]',
                            'blur-[30px]',
                        )}
                    />
                    <h1 className="font-mono text-4xl font-semibold">Dotted Surface</h1>
                </div>
            </DottedSurface> */}

            {/* NAVBAR */}
            <div className="flex items-center justify-between bg-white px-6 py-4 shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3 ml-[-13px] md:ml-0">
                    <img src={brandLogo} alt="Krazystore" className="h-13 w-auto object-contain" />
                </div>

                <button
                    onClick={() => navigate("/register")}
                    className="text-[1.1rem] md:text-[1.3rem]text-shadow-black transition md:hover:text-white cursor-pointer duration-300 px-4 py-2 md:bg-black border md:hover:bg-red-600 rounded-xl bg-black text-white md:text-white"
                >
                    Sign Up
                </button>
            </div>

            {/* LOGIN CARD */}
            <div className="flex flex-col min-h-[85vh] items-center justify-center px-4">
                <h1 className="mt-3 text-[3rem] mt-[-2rem] md:mt-0 font-['rajdhani'] font-bold">
                    Welcome Back
                </h1>
                <div className="mx-auto mt-5 max-w-[320px] md:max-w-[600px] rounded-3xl bg-white p-8 drop-shadow-2xl border-[2px] border-red-600/60">
                    <span className="text-[1.6rem] md:text-[1.8rem] font-['rajdhani'] font-extrabold tracking-widest text-red-600">
                        AFFILIATE LOGIN
                    </span>


                    <p className="mt-2 text-sm text-gray-500">
                        Login to manage your affiliate
                        earnings, payouts and conversions.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-8 space-y-6"
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
                                className="w-full border-b-2 border-black/20 py-3 text-sm outline-none transition duration-500 focus:border-black"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="relative">
                            <label className="mb-2 block text-sm font-medium">
                                Password
                            </label>

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full border-b-2 border-black/20 py-3 pr-16 text-sm outline-none transition duration-500 focus:border-black"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
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
                            {loading
                                ? "Logging In..."
                                : "Login"}
                        </button>
                    </form>

                    {/* FOOTER */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don&apos;t have an account?{" "}
                            <span
                                onClick={() =>
                                    navigate("/register")
                                }
                                className="cursor-pointer font-semibold text-black"
                            >
                                Register
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;