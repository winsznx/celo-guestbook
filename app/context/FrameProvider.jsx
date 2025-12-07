"use client";

import { createContext, useContext, useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";

const FrameContext = createContext({
    isSDKLoaded: false,
    context: undefined,
    user: undefined,
});

export function FrameProvider({ children }) {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [context, setContext] = useState();
    const [user, setUser] = useState();

    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setContext(context);
                if (context?.user) {
                    setUser(context.user);
                }

                // Signal ready to hide splash screen
                sdk.actions.ready();

                setIsSDKLoaded(true);
            } catch (error) {
                console.error("Error loading Farcaster SDK:", error);
            }
        };

        // Only run on client
        if (typeof window !== "undefined") {
            load();
        }
    }, []);

    return (
        <FrameContext.Provider value={{ isSDKLoaded, context, user }}>
            {children}
        </FrameContext.Provider>
    );
}

export function useFrame() {
    return useContext(FrameContext);
}
