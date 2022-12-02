/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

using Autodesk.Forge;
using Hangfire;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace DesignCheck.Controllers
{
    public class DesignAutomationController : ControllerBase
    {
        private IWebHostEnvironment _env;
        public DesignAutomationController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost]
        [Route("api/aps/callback/designautomation/{userId}/{hubId}/{projectId}/{versionId}")]
        public IActionResult OnReadyDesignCheck(string userId, string hubId, string projectId, string versionId, [FromBody]dynamic body)
        {
            // catch any errors, we don't want to return 500
            try
            {
                // your webhook should return immediately!
                // so can start a second thread (not good) or use a queueing system (e.g. hangfire)

                // starting a new thread is not an elegant idea, we don't have control if the operation actually complets...
                /*
                new System.Threading.Tasks.Task(async () =>
                  {
                      // your code here
                  }).Start();
                */

                // use Hangfire to schedule a job
                BackgroundJob.Schedule(() => CreateIssues(userId, hubId, projectId, versionId, _env.WebRootPath, Request.Host.ToString()), TimeSpan.FromSeconds(1));
            }
            catch { }

            // ALWAYS return ok (200)
            return Ok();
        }

        public async Task CreateIssues(string userId, string hubId, string projectId, string versionId, string contentRootPath, string host)
        {
            string bucketName = "revitdesigncheck" + DesignAutomation4Revit.NickName.ToLower();
            string resultFilename = versionId + ".txt";

            //Here we retrieve de data uploaded to the bucket from Design Automation
            ObjectsApi objects = new ObjectsApi();
            dynamic token = await Credentials.Get2LeggedTokenAsync(new Scope[] { Scope.DataRead });
            objects.Configuration.AccessToken = token.access_token;
            string fileContents;
            try
            {
                dynamic objectDownload = objects.GetObject(bucketName, resultFilename);
                using (StreamReader reader = new StreamReader(objectDownload))
                {
                    fileContents = reader.ReadToEnd();
                }
            }
            catch (Exception e)
            {
                //couldn't download the file
                return;
            }
            
            Credentials credentials = await Credentials.FromDatabaseAsync(userId);

            VersionsApi versionApi = new VersionsApi();
            versionApi.Configuration.AccessToken = credentials.TokenInternal;
            dynamic versionItem = await versionApi.GetVersionItemAsync(projectId, versionId.Base64Decode());
            string itemId = versionItem.data.id;
            int version = Int32.Parse(versionId.Split("_")[1].Base64Decode().Split("=")[1]);

            string title = string.Format("Column clash report for version {0}", version);
            string description = string.Format("<a href=\"http://{0}/issues/?urn={1}&id={2}\" target=\"_blank\">Click to view issues</a>", host, versionId, fileContents.Base64Encode());

            // create issues
            BIM360Issues issues = new BIM360Issues();
            string containerId = await issues.GetContainer(credentials.TokenInternal, hubId, projectId);
            await issues.CreateIssue(credentials.TokenInternal, containerId, itemId, version, title, description);

            // only delete if it completes
            System.IO.File.Delete(resultFilename);
            objects.DeleteObject(bucketName, resultFilename);
        }
    }
}