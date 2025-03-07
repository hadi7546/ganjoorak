import React from 'react';
import { motion } from 'framer-motion';
import '../styles/LoadingScreen.css';

const LoadingScreen = () => {
    return (
        <div className="loading-screen">
            <motion.div
                className="loading-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div
                    className="loading-spinner"
                    animate={{
                        rotate: 360,
                        transition: {
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "linear"
                        }
                    }}
                />
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    در حال بارگذاری اشعار...
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    لطفاً منتظر بمانید
                </motion.p>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;