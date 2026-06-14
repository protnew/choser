export async function onRequest(context) {
    // Placeholder for middleware logic
    try {
        return await context.next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}
