import React from 'react';
import { motion } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';
import '../styles/ErrorScreen.css';

const ErrorScreen = ({ message }) => {
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="error-screen">
            <motion.div
                className="error-container"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div
                    className="error-icon"
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 10 }}
                    transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 0.5
                    }}
                >
                    <FaExclamationTriangle />
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    خطا در بارگذاری
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {message || 'مشکلی در دریافت اطلاعات از سرور رخ داده است.'}
                </motion.p>
                <motion.button
                    className="retry-button"
                    onClick={handleRetry}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    تلاش مجدد
                </motion.button>
            </motion.div>
        </div>
    );
};

export default ErrorScreen;