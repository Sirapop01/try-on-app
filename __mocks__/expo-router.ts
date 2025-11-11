// __mocks__/expo-router.ts
export const useRouter = () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
});
export const useSegments = () => ["(tabs)"];
export const Slot = ({ children }: any) => children ?? null;
export const Stack = ({ children }: any) => children ?? null;
