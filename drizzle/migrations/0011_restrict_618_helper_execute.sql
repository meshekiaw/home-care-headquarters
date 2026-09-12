REVOKE ALL ON FUNCTION public.compute_618_content_hash(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.form_618_signatures_complete(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_618_form(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_618_form(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_618_signature(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_618_form(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_618_form(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_618_signature(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_618_content_hash(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.form_618_signatures_complete(uuid) TO service_role;