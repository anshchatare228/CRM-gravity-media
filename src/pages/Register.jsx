import { useState } from "react";
import { useNavigate } from "react-router-dom";
import brandLogo from "../assets/logo.png";

const STEPS = [
    {
        label: "PROFILE",
        title: "Basic Information",
        subtitle: "Tell us about yourself and your social profile.",
    },
    {
        label: "PAYMENT",
        title: "Payment Details",
        subtitle: "Add your preferred payment method for payouts.",
    },
    {
        label: "SECURITY",
        title: "Secure Your Account",
        subtitle: "Create a password for your affiliate account.",
    },
];

// ------------------------------------------------------------------
// MOCK REGISTER — replace this function with your real API call later.
// e.g. const data = await registerAffiliate(payload);
// ------------------------------------------------------------------
const mockRegisterAffiliate = async (payload) => {
    await new Promise((res) => setTimeout(res, 700)); // fake network delay

    return {
        success: true,
        token: "demo-token-123",
        affiliate: {
            name: payload.name,
            email: payload.email,
            ref_code: "DEMO123",
        },
    };
};

function Register({ onAuthSuccess }) {
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        instagram_handle: "",

        payment_method: "UPI",
        payment_value: "",

        bank_account_name: "",
        bank_account_number: "",
        bank_ifsc: "",

        password: "",
        confirmPassword: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "name" || name === "bank_account_name") {
            setFormData((prev) => ({ ...prev, [name]: value.replace(/[^a-zA-Z\s]/g, "") }));
            return;
        }

        if (name === "phone" || name === "bank_account_number") {
            setFormData((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
            return;
        }

        if (name === "bank_ifsc") {
            setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateStep = () => {
        if (currentStep === 0) {
            if (!formData.name || !formData.email || !formData.phone || !formData.instagram_handle) {
                return "Please fill all required fields";
            }
        }

        if (currentStep === 1) {
            if (formData.payment_method === "BANK") {
                if (!formData.bank_account_name || !formData.bank_account_number || !formData.bank_ifsc) {
                    return "Please fill all bank details";
                }
                if (formData.bank_ifsc.length !== 11) {
                    return "Please enter a valid IFSC code";
                }
            } else if (!formData.payment_value) {
                return "Please enter payment details";
            }
        }

        if (currentStep === 2) {
            if (!formData.password || !formData.confirmPassword) {
                return "Please fill all required fields";
            }
            if (formData.password.length < 8) {
                return "Password must be at least 8 characters";
            }
            if (formData.password.trim() !== formData.confirmPassword.trim()) {
                return "Passwords do not match";
            }
        }

        return "";
    };

    const goNext = () => {
        const validationError = validateStep();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError("");
        setCurrentStep((prev) => prev + 1);
    };

    const goBack = () => {
        setError("");
        setCurrentStep((prev) => prev - 1);
    };

    const handleSubmit = async () => {
        try {
            const validationError = validateStep();
            if (validationError) {
                setError(validationError);
                return;
            }

            setLoading(true);

            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                instagram_handle: formData.instagram_handle,
                password: formData.password,
                confirm_password: formData.confirmPassword,
                payout_method: formData.payment_method.toLowerCase(),
                ...(formData.payment_method === "BANK"
                    ? {
                          bank_account_number: formData.bank_account_number,
                          bank_ifsc: formData.bank_ifsc,
                          bank_holder_name: formData.bank_account_name,
                      }
                    : {
                          upi_id: formData.payment_value,
                      }),
            };

            const data = await mockRegisterAffiliate(payload);

            if (!data.success) {
                setError(data.message);
                return;
            }

            if (onAuthSuccess) {
                onAuthSuccess(data.token, data.affiliate);
            } else {
                localStorage.setItem("affiliate_token", data.token);
                localStorage.setItem("affiliate_user", JSON.stringify(data.affiliate));
            }

            navigate("/dashboard");
        } catch (err) {
            console.log(err);
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-12">
            {/* NAVBAR */}
            <div className="flex items-center justify-between bg-white px-6 py-4 shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3 ml-[-13px] md:ml-0">
                    <img src={brandLogo} alt="Brand" className="h-13 w-auto object-contain" />
                </div>

                <button
                    onClick={() => navigate("/login")}
                    className="text-[1.1rem] md:text-[1.3rem] text-shadow-black transition md:hover:text-white cursor-pointer duration-300 px-4 py-2 md:bg-black border md:hover:bg-red-600 rounded-xl bg-black text-white md:text-white"
                >
                    Log In
                </button>
            </div>

            {/* STEPS */}
            <div className="mt-10 flex items-center justify-center gap-3">
                {STEPS.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <div className="flex cursor-pointer flex-col items-center">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition ${
                                    currentStep >= index ? "bg-black text-white" : "bg-gray-200 text-black"
                                }`}
                            >
                                {index + 1}
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500">{step.label}</p>
                        </div>

                        {index < STEPS.length - 1 && (
                            <div
                                className={`mb-5 h-[2px] w-16 ${
                                    currentStep > index ? "bg-red-400" : "bg-gray-300"
                                }`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* CARD */}
            <div className="mx-auto mt-5 max-w-[320px] md:max-w-[600px] rounded-3xl bg-white p-8 drop-shadow-2xl border-[2px] border-red-600/60">
                <span className="text-xs font-semibold tracking-wider text-red-600">
                    STEP {currentStep + 1} OF 3
                </span>

                <h1 className="mt-3 text-3xl font-bold">{STEPS[currentStep].title}</h1>
                <p className="mt-2 text-sm text-gray-500">{STEPS[currentStep].subtitle}</p>

                {/* STEP 1 */}
                {currentStep === 0 && (
                    <div className="mt-8 space-y-5">
                        <div>
                            <label className="mb-0 block text-sm font-medium">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="mb-0 block text-sm font-medium">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="mb-0 block text-sm font-medium">Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="9876543210"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="mb-0 block text-sm font-medium">Instagram Handle</label>
                            <input
                                type="text"
                                name="instagram_handle"
                                value={formData.instagram_handle}
                                onChange={handleChange}
                                placeholder="@yourhandle"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {currentStep === 1 && (
                    <div className="mt-8 space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Payment Method</label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleChange}
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            >
                                <option value="UPI">UPI</option>
                                <option value="BANK">Bank Transfer</option>
                            </select>
                        </div>

                        {formData.payment_method === "BANK" ? (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">Account Holder Name</label>
                                    <input
                                        type="text"
                                        name="bank_account_name"
                                        value={formData.bank_account_name}
                                        onChange={handleChange}
                                        placeholder="As per bank records"
                                        className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">Account Number</label>
                                    <input
                                        type="text"
                                        name="bank_account_number"
                                        value={formData.bank_account_number}
                                        onChange={handleChange}
                                        placeholder="0000000000"
                                        className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">IFSC Code</label>
                                    <input
                                        type="text"
                                        name="bank_ifsc"
                                        value={formData.bank_ifsc}
                                        onChange={handleChange}
                                        placeholder="HDFC0000000"
                                        maxLength={11}
                                        className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black uppercase"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="mb-2 block text-sm font-medium">UPI ID</label>
                                <input
                                    type="text"
                                    name="payment_value"
                                    value={formData.payment_value}
                                    onChange={handleChange}
                                    placeholder="example@upi"
                                    className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3 */}
                {currentStep === 2 && (
                    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="relative">
                            <label className="mb-2 block text-sm font-medium">Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[42px] text-xs text-gray-500"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>

                        <div className="relative">
                            <label className="mb-2 block text-sm font-medium">Confirm Password</label>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full duration-500 py-3 text-sm outline-none border-b-2 border-black/20 focus:border-black"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-[42px] text-xs text-gray-500"
                            >
                                {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* FOOTER */}
                <div className="mt-8 flex items-center justify-end md:justify-between">
                    <p className="hidden md:block mt-[-1rem] md:mt-0 text-xs text-gray-500">
                        By continuing, you agree to our terms.
                    </p>

                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={goBack}
                                className="text-lg rounded-[15px] border-2 border-black px-6 py-2 font-semibold transition hover:bg-gray-100"
                            >
                                Back
                            </button>
                        )}

                        {currentStep < 2 ? (
                            <button
                                onClick={goNext}
                                className="text-lg rounded-[15px] bg-black px-6 py-2 font-semibold text-white transition hover:opacity-90"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                            >
                                {loading ? "Creating..." : "Create Account"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;