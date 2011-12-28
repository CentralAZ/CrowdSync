# CrowdSync

CrowdSync is an open source project that will synchronize many devices to perform in time with each other to a musical track.

Read through Nick and Jason's blog posts for a more detailed technical explanation:

* [Nick's blog](http://codersforchrist.com/cs/blogs/nick/archive/2011/12/24/Control-Mobile-Phones-During-Worship-Experience.aspx)
* [Jason's blog](http://jsondata.tumblr.com/post/14874000238/crowdsync)

## Licenses

CrowdSync may be freely distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

## Getting started

To run CrowdSync, drop the contents of the `public/` folder into a folder in your web root.

Additionally, drop the contents of `ws/net/` into your web root as well. If your web host supports ASP.NET 3.5 or greater you should be set.

Test the web service by going to `http://yourdomain.com/yourfolder/crowdsync.asmx`. If you see the web service help page, you're in business. 
You should be able to load `index.htm` or `tree.htm` and see some action.

### Note

In order to play audio, CrowdSync requires a webkit browser. Although we really liked the Mozilla API and have plans on supporting it in the future, 
we needed to stick to Chrome for running `tree.htm` for the performance benefits that the V8 JavaScript engine offers.