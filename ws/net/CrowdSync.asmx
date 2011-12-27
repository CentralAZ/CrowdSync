<%@ WebService Class="ChristmasService" Language="C#" %>
/**********************************************************************
* Description:	Christmas Player
* Created By:	Nick Airdo @ Central Christian Church of the East Valley
*				Jason Offutt @ Central Christian Church of the East Valley
* Date Created:	8/1/2011 02:12:43 PM
*
* $Workfile: CrowdSync.asmx $
* $Revision: 1 $ 
* $Header: /trunk/CrowdSync/CrowdSync/ws/net/CrowdSync.asmx   1   2011-09-01 11:36:35-07:00   JasonO $
* 
* $Log: /trunk/CrowdSync/CrowdSync/ws/net/CrowdSync.asmx $
* 
* Revision: 1   Date: 2011-09-01 18:36:35Z   User: JasonO 
* 
* Revision: 5   Date: 2011-08-04 23:41:57Z   User: nicka 
**********************************************************************/
using System;
using System.ComponentModel;
using System.Web.Script.Services;
using System.Web.Services;

[WebService(Namespace = "http://www.centralaz.com/")]
[WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
[ToolboxItem(false)]
[ScriptService]
public class ChristmasService : WebService
{
    [WebMethod]
    [ScriptMethod(ResponseFormat = ResponseFormat.Json, UseHttpGet = true)]
    public long GetTime()
    {
        var epochTime = (long) (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
        return epochTime;
    }

	/// <summary>
	/// Returns the next upcoming start time for the given campusID
	/// </summary>
	/// <param name="campusID"></param>
	/// <returns></returns>
	[WebMethod( CacheDuration=70 )]
	[ScriptMethod( ResponseFormat = ResponseFormat.Json, UseHttpGet = true )]
	public object GetNextStartByCampusID( int campusID )
	{
		
	    // STUB DATA FOR TESTING
	    long nowPlusAFewMinutes = (long)( DateTime.UtcNow - new DateTime( 1970, 1, 1 ) ).TotalMilliseconds + 40000 ;
	    return GetSongJson( nowPlusAFewMinutes, "data" );
	}

	/// <summary>
	/// TODO.  This will actually need to be real.
	/// </summary>
	/// <param name="startTime"></param>
	/// <param name="data"></param>
	/// <returns></returns>
	private static object GetSongJson( long startTime, string data )
	{
		return new
		{
			startTime = startTime,
			ticks = new[]
		    {
		        new 
		        {
		            notes = new string[]{ "a", "b" }, 
		            time = 000000000
		        },
		        new 
		        {
		            notes = new string[]{ "a", "c" }, 
		            time = 000000500
		        },
		        new 
		        {
		            notes = new string[]{ "d" }, 
		            time = 000001500
		        },
		        new 
		        {
		            notes = new string[]{ "d" }, 
		            time = 000002500
		        }
		    }
		};
	}
	
}