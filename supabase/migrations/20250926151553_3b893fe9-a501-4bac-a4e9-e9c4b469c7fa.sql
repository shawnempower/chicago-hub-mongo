-- Add soft delete functionality to ad_packages table
ALTER TABLE public.ad_packages 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for better performance when filtering out deleted packages
CREATE INDEX idx_ad_packages_deleted_at ON public.ad_packages(deleted_at) WHERE deleted_at IS NULL;

-- Create function to check package usage before deletion
CREATE OR REPLACE FUNCTION public.get_package_usage_stats(package_legacy_id INTEGER)
RETURNS TABLE(
  saved_count INTEGER,
  users_with_saves TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as saved_count,
    ARRAY_AGG(DISTINCT p.first_name || ' ' || p.last_name) as users_with_saves
  FROM saved_packages sp
  LEFT JOIN profiles p ON p.user_id = sp.user_id
  WHERE sp.package_id = package_legacy_id;
END;
$$;

-- Create function to safely delete package with cascade options
CREATE OR REPLACE FUNCTION public.safe_delete_package(
  package_uuid UUID,
  force_delete BOOLEAN DEFAULT FALSE,
  cascade_saves BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  package_legacy_id INTEGER;
  usage_stats RECORD;
  result JSON;
BEGIN
  -- Get the legacy_id for the package
  SELECT legacy_id INTO package_legacy_id 
  FROM ad_packages 
  WHERE id = package_uuid AND deleted_at IS NULL;
  
  IF package_legacy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Package not found or already deleted');
  END IF;
  
  -- Get usage statistics
  SELECT * INTO usage_stats 
  FROM get_package_usage_stats(package_legacy_id);
  
  -- Check if package has saves and force_delete is false
  IF usage_stats.saved_count > 0 AND NOT force_delete THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Package has saved references',
      'saved_count', usage_stats.saved_count,
      'users_with_saves', usage_stats.users_with_saves
    );
  END IF;
  
  -- If cascade_saves is true, delete the saved package references
  IF cascade_saves AND usage_stats.saved_count > 0 THEN
    DELETE FROM saved_packages WHERE package_id = package_legacy_id;
  END IF;
  
  -- Soft delete the package
  UPDATE ad_packages 
  SET deleted_at = now() 
  WHERE id = package_uuid;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Package deleted successfully',
    'cascade_deleted_saves', CASE WHEN cascade_saves THEN usage_stats.saved_count ELSE 0 END
  );
END;
$$;

-- Create function to restore soft-deleted package
CREATE OR REPLACE FUNCTION public.restore_package(package_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ad_packages 
  SET deleted_at = NULL 
  WHERE id = package_uuid AND deleted_at IS NOT NULL;
  
  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Package restored successfully');
  ELSE
    RETURN json_build_object('success', false, 'error', 'Package not found or not deleted');
  END IF;
END;
$$;