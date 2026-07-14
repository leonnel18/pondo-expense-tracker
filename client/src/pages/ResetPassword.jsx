import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        // In a real implementation, we would call the API to send a reset password email
        // For now, we'll just simulate the submission
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>
                
                {isSubmitted ? (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="text-sm text-green-700">
                            If an account with that email exists, a password reset link has been sent.
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Sending...' : 'Send reset link'}
                            </button>
                        </div>
                    </form>
                )}
                
                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-500">
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}