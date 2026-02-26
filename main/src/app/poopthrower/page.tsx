export default function PoopthrowerPage() {
    return (
        <iframe
            src="/poopthrower/game.html"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                border: "none",
            }}
            allowFullScreen
        />
    );
}
