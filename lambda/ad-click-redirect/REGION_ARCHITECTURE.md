# Multi-Region Architecture

## TL;DR

✅ **S3 Bucket:** us-east-2 (your primary region)  
⚠️ **Lambda@Edge:** us-east-1 (AWS requirement - cannot change)  
✅ **Other Lambdas:** us-east-2 (your choice)  
✅ **CloudFront:** Global (edge locations worldwide)

This works perfectly together! Lambda@Edge in us-east-1 has no performance impact.

---

## Why Lambda@Edge Must Be in us-east-1

From AWS Documentation:
> "Lambda@Edge functions must be created in the US East (N. Virginia) Region. Lambda@Edge then replicates the function to AWS locations globally."

This is a **hard requirement** - you cannot create Lambda@Edge functions in any other region.

### Why AWS Does This

1. **Single Source of Truth:** All Lambda@Edge functions originate from us-east-1
2. **Global Replication:** AWS replicates from us-east-1 to all edge locations
3. **Version Management:** Easier to manage versions when there's one source region
4. **Historical Reason:** Lambda@Edge launched in us-east-1 first, became the standard

---

## Your Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Resources                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ us-east-2 (Ohio) - Your Primary Region                      │    │
│  │─────────────────────────────────────────────────────────────│    │
│  │                                                              │    │
│  │  S3 Bucket: empowerlocal-pixels-ads                         │    │
│  │    ├── pxl.png (1x1 pixel)                                  │    │
│  │    └── /a/ (creative assets)                                │    │
│  │                                                              │    │
│  │  Lambda: empowerlocal-tracking-sync                         │    │
│  │    └── Syncs Athena → MongoDB daily                         │    │
│  │                                                              │    │
│  │  Lambda: storefront-ai-chat                                 │    │
│  │    └── AI chat for storefronts                              │    │
│  │                                                              │    │
│  │  Other application Lambdas...                               │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ us-east-1 (N. Virginia) - Lambda@Edge Only                  │    │
│  │─────────────────────────────────────────────────────────────│    │
│  │                                                              │    │
│  │  Lambda@Edge: ad-click-redirect                             │    │
│  │    └── Source function (replicated globally by AWS)         │    │
│  │                                                              │    │
│  │  SSL Certificate (for CloudFront)                           │    │
│  │    └── CloudFront certificates must be in us-east-1         │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ CloudFront (Global Edge Network)                            │    │
│  │─────────────────────────────────────────────────────────────│    │
│  │                                                              │    │
│  │  Distribution: E14BMKEZBNSGP4                               │    │
│  │  Domain: dxafls8akrlrp.cloudfront.net                       │    │
│  │                                                              │    │
│  │  Origin: S3 bucket in us-east-2 ✅                          │    │
│  │  Lambda@Edge: Function from us-east-1 ✅                    │    │
│  │                                                              │    │
│  │  Edge Locations: 450+ worldwide                             │    │
│  │    ├── North America (60+)                                  │    │
│  │    ├── Europe (80+)                                         │    │
│  │    ├── Asia (120+)                                          │    │
│  │    └── Rest of world (190+)                                 │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How Requests Flow

### Impression Pixel Request
```
1. User in Chicago views ad
   ↓
2. Browser loads: https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=...
   ↓
3. Request hits Chicago CloudFront edge (ORD50)
   ↓
4. CloudFront fetches pxl.png from S3 in us-east-2
   ↓
5. CloudFront serves pixel to user
   ↓
6. CloudFront Access Logs → S3 in us-east-2
```

**Note:** Lambda@Edge is NOT involved in pixel requests - just serves static file.

### Click Redirect Request
```
1. User in Chicago clicks ad
   ↓
2. Browser requests: https://dxafls8akrlrp.cloudfront.net/c?r=...
   ↓
3. Request hits Chicago CloudFront edge (ORD50)
   ↓
4. Lambda@Edge executes at ORD50 edge
   (Copy of function replicated from us-east-1)
   ↓
5. Lambda returns 302 redirect
   ↓
6. Browser redirects to landing page
   ↓
7. CloudFront Access Logs → S3 in us-east-2
```

**Key Point:** Lambda@Edge runs at the edge location near the user, NOT in us-east-1!

---

## Performance Impact: ZERO

### Why us-east-1 Lambda@Edge Doesn't Slow Things Down

1. **Runs at the Edge:** Lambda@Edge executes at CloudFront edge locations worldwide, not in us-east-1
2. **Pre-Replicated:** AWS replicates the function from us-east-1 to all edges BEFORE any requests
3. **No Cross-Region Calls:** The function doesn't call back to us-east-1 during execution
4. **Local Execution:** User in Chicago → Lambda runs in Chicago edge (ORD50)

### Latency Breakdown

| Component | Latency | Location |
|-----------|---------|----------|
| User → CloudFront Edge | 5-20ms | Near user |
| Lambda@Edge execution | 10-30ms | At edge |
| CloudFront → S3 (us-east-2) | 20-40ms | Only for pixels |
| **Total for click** | **15-50ms** | Fast! |

---

## Best Practices

### Keep in us-east-2 ✅
- S3 buckets
- Application Lambdas (tracking-sync, etc.)
- RDS/MongoDB (if in AWS)
- Application servers

### Must be in us-east-1 ⚠️
- Lambda@Edge functions
- CloudFront SSL certificates (ACM)

### Global (no region) 🌍
- CloudFront distributions
- Route53 DNS

---

## Cost Implications

### No Extra Cost for Multi-Region

- **Lambda@Edge:** Same price regardless of region ($0.60/1M requests)
- **CloudFront:** Same price for all origins
- **Data Transfer:** S3 → CloudFront is free within same region

**Your costs:**
- Lambda@Edge execution: ~$0.18/month (300K clicks)
- CloudFront bandwidth: ~$0.09/month
- No extra cost for us-east-1 → edge replication (AWS handles free)

---

## Monitoring

### CloudWatch Logs

Lambda@Edge logs appear in **the region where they execute**:

```bash
# Logs appear near edge locations, not us-east-1!
# Check multiple regions:

# Example: Check logs in US East 1 (for East Coast users)
aws logs tail --follow /aws/lambda/us-east-1.ad-click-redirect

# Example: Check logs in US East 2 (for Midwest users)
aws logs tail --follow /aws/lambda/us-east-2.ad-click-redirect

# Example: Check logs in EU West 1 (for European users)
aws logs tail --follow /aws/lambda/eu-west-1.ad-click-redirect
```

### CloudFront Logs

Access logs go to your specified S3 bucket (can be us-east-2):

```bash
aws s3 ls s3://empowerlocal-cloudfront-logs/tracking/
```

---

## Common Questions

### Q: Can I move Lambda@Edge to us-east-2?
**A:** No, AWS doesn't allow Lambda@Edge in any region except us-east-1.

### Q: Will this cause latency issues?
**A:** No! The function runs at edge locations near users, not in us-east-1.

### Q: What about data sovereignty (GDPR, etc.)?
**A:** The function executes at the edge location in the user's region. Logs can be stored in your preferred region (us-east-2).

### Q: Can I have some Lambdas in us-east-2 and Lambda@Edge in us-east-1?
**A:** Yes! That's exactly what you should do. Application Lambdas in us-east-2, Lambda@Edge in us-east-1.

### Q: What if us-east-1 goes down?
**A:** Lambda@Edge functions are already replicated to all edge locations. If us-east-1 goes down, existing functions continue working. You just can't deploy new versions until us-east-1 is back.

### Q: How do I update the function?
**A:** Update in us-east-1, publish a new version, update CloudFront to use new version ARN. AWS replicates to all edges (takes 5-15 minutes).

---

## Deployment Commands

```bash
# Create Lambda@Edge in us-east-1 (required)
aws lambda create-function \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name ad-click-redirect \
  ...

# Update Lambda@Edge (must use us-east-1)
aws lambda update-function-code \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name ad-click-redirect \
  --zip-file fileb://function.zip

# Publish new version (must use us-east-1)
aws lambda publish-version \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name ad-click-redirect
```

---

## Conclusion

✅ **S3 in us-east-2:** Great for data residency  
✅ **Lambda@Edge in us-east-1:** Required by AWS, zero performance impact  
✅ **Application Lambdas in us-east-2:** Keep them close to your data  
✅ **CloudFront global:** Best performance worldwide

This multi-region setup is **optimal and necessary**. You're using each AWS service in its ideal configuration! 🎉
