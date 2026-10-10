(() => {
    const config = window.MLN_SUPABASE_CONFIG || {};
    const byId = id => document.getElementById(id);
    let client = null;
    if (config.url && config.publishableKey && window.supabase?.createClient) {
        client = window.supabase.createClient(config.url, config.publishableKey);
    }
    window.MLN_SUPABASE = client;
    let activeUser = null;
    let channel = null;
    let syncTimer = null;
    let syncing = false;

    function setStatus(message, isError = false) {
        const el = byId('authStatus');
        if (!el) return;
        el.textContent = message;
        el.className = `my-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isError ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200' : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200'}`;
    }
    function setCloudStatus(message, isError = false) {
        const el = byId('cloudSyncStatus');
        if (!el) return;
        el.textContent = message;
        el.className = `text-xs ${isError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`;
    }
    function setSignedIn(user) {
        activeUser = user || null;
        window.MLN_CURRENT_USER = activeUser;
        byId('signedOutPanel')?.classList.toggle('hidden', !!activeUser);
        byId('signedInPanel')?.classList.toggle('hidden', !activeUser);
        const emailEl = byId('accountEmail');
        if (emailEl) emailEl.textContent = activeUser?.email || '';
        const button = byId('accountButton');
        if (button) button.title = activeUser ? `Signed in: ${activeUser.email}` : 'Tai khoan va dong bo';
    }
    function requireClient() {
        if (client) return true;
        setStatus('Chua cau hinh Supabase. Hay tao project, chay supabase/schema.sql va dien URL cung publishable key vao supabase-config.js.', true);
        return false;
    }
    function progressSummary() {
        const progress = window.exportMLNProgress();
        const count = map => Object.values(map || {}).filter(item => item && item.value).length;
        return `Da on ${count(progress.answered)}/533 cau; dung ${count(progress.correct)}; sai ${count(progress.wrong)}; danh dau ${count(progress.starred)}.`;
    }
    async function readRemote() {
        const { data, error } = await client.from('user_progress').select('payload').eq('user_id', activeUser.id).maybeSingle();
        if (error) throw error;
        return data?.payload || null;
    }
    async function writeRemote(payload) {
        const { error } = await client.from('user_progress').upsert({ user_id: activeUser.id, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) throw error;
    }
    async function syncOnLogin() {
        if (!activeUser || syncing) return;
        syncing = true;
        setCloudStatus('Dang hop nhat tien do tren thiet bi va cloud...');
        try {
            const remote = await readRemote();
            const merged = window.mergeMLNProgress(remote || {});
            await writeRemote(merged);
            setCloudStatus(`Da dong bo. ${progressSummary()}`);
        } catch (error) {
            setCloudStatus(`Dong bo chua thanh cong: ${error.message}`, true);
        } finally { syncing = false; }
    }
    async function flushSync() {
        if (!activeUser || !client || syncing) return;
        syncing = true;
        setCloudStatus('Dang luu tien do len cloud...');
        try {
            const remote = await readRemote();
            const before = JSON.stringify(window.exportMLNProgress());
            const merged = window.mergeMLNProgress(remote || {});
            await writeRemote(merged);
            setCloudStatus(`Da dong bo. ${progressSummary()}`);
            if (JSON.stringify(window.exportMLNProgress()) !== before) {
                clearTimeout(syncTimer);
                syncTimer = setTimeout(flushSync, 700);
            }
        } catch (error) {
            setCloudStatus(`Luu cloud that bai; tien do van con tren thiet bi: ${error.message}`, true);
        } finally { syncing = false; }
    }
    window.queueMLNProgressSync = () => {
        if (!activeUser) return;
        setCloudStatus('Co tien do moi, dang cho dong bo...');
        clearTimeout(syncTimer);
        syncTimer = setTimeout(flushSync, 700);
    };
    function subscribeToProgress() {
        if (!activeUser || !client) return;
        if (channel) client.removeChannel(channel);
        channel = client.channel(`mln-progress-${activeUser.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_progress', filter: `user_id=eq.${activeUser.id}` }, event => {
                const remote = event.new?.payload;
                if (!remote) return;
                const before = JSON.stringify(window.exportMLNProgress());
                window.mergeMLNProgress(remote);
                if (JSON.stringify(window.exportMLNProgress()) !== before) window.queueMLNProgressSync();
            }).subscribe();
    }
    async function handleSession(session) {
        const user = session?.user || null;
        const previousId = activeUser?.id || null;
        if (!user) {
            clearTimeout(syncTimer);
            if (channel && client) client.removeChannel(channel);
            channel = null;
            setSignedIn(null);
            window.showMLNLoginGate?.();
            setStatus('Dang o che do luu tren thiet bi. Dang nhap cung tai khoan tren may tinh va dien thoai de dong bo.');
            return;
        }
        setSignedIn(user);
        window.showMLNLanding?.(user);
        if (previousId === user.id) return;
        setStatus('Dang nhap thanh cong. Dang dong bo tien do...');
        await syncOnLogin();
        subscribeToProgress();
        setStatus('Tai khoan da ket noi. Tien do duoc dong bo tu dong.');
    }
    window.openAccountModal = () => {
        if (typeof window.openModal === 'function') window.openModal('authModal');
        if (!client) requireClient();
        window.lucide?.createIcons();
    };
    window.registerMLN = async () => {
        if (!requireClient()) return;
        const email = byId('authEmail').value.trim();
        const password = byId('authPassword').value;
        if (!email || password.length < 8) return setStatus('Nhap email hop le va mat khau co it nhat 8 ky tu.', true);
        setStatus('Dang tao tai khoan...');
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) return setStatus(error.message, true);
        if (data.session) { await handleSession(data.session); window.closeModal?.('authModal'); }
        else setStatus('Da gui yeu cau dang ky. Hay xac nhan email, sau do dang nhap tai day.');
    };
    window.loginMLN = async () => {
        if (!requireClient()) return;
        const email = byId('authEmail').value.trim();
        const password = byId('authPassword').value;
        if (!email || !password) return setStatus('Nhap email va mat khau de dang nhap.', true);
        setStatus('Dang dang nhap...');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) return setStatus(error.message, true);
        await handleSession(data.session);
        window.closeModal?.('authModal');
    };
    window.completePasswordResetMLN = async () => {
        if (!client) return;
        const password = byId('newAuthPassword').value;
        if (password.length < 8) return setStatus('Mat khau can co it nhat 8 ky tu.', true);
        const { error } = await client.auth.updateUser({ password });
        if (error) return setStatus(error.message, true);
        byId('recoveryPanel')?.classList.add('hidden');
        byId('newAuthPassword').value = '';
        setStatus('Da cap nhat mat khau.');
    };
    window.logoutMLN = async () => {
        if (!client) return;
        const { error } = await client.auth.signOut();
        if (error) return setCloudStatus(error.message, true);
        activeUser = null;
        setSignedIn(null);
        window.showMLNLoginGate?.();
        setStatus('Da dang xuat. Tien do cloud van duoc luu trong tai khoan.');
    };
    window.resetPasswordMLN = async () => {
        if (!requireClient()) return;
        const email = byId('authEmail').value.trim();
        if (!email) return setStatus('Nhap email truoc de nhan lien ket dat lai mat khau.', true);
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset=1` });
        setStatus(error ? error.message : 'Da gui lien ket dat lai mat khau neu email co tai khoan.', !!error);
    };
    document.addEventListener('DOMContentLoaded', async () => {
        if (!config.url || !config.publishableKey || !window.supabase?.createClient) {
            setSignedIn(null);
            setStatus('Chua cau hinh dong bo cloud. Ung dung van luu tien do tren thiet bi nay.');
            return;
        }
        if (!client) {
            setSignedIn(null);
            setStatus('Khong the khoi tao Supabase client. Hay kiem tra URL va publishable key.', true);
            return;
        }
        client.auth.onAuthStateChange((event, session) => setTimeout(async () => {
            if (event === 'PASSWORD_RECOVERY') byId('recoveryPanel')?.classList.remove('hidden');
            await handleSession(session);
            if (event === 'PASSWORD_RECOVERY') setStatus('Nhap mat khau moi cho tai khoan.');
        }, 0));
        const { data, error } = await client.auth.getSession();
        if (error) setStatus(error.message, true);
        else await handleSession(data.session);
    });
})();
