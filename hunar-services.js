/* Hunar Phase 1 data/service layer. UI remains vanilla JS and calls these services. */
(function(){
  const db=()=>window.supabaseClient;
  const user=()=>window.productionUser;
  const auth=()=>user()?.id||null;
  const requireAuth=()=>{if(!auth()) throw new Error('Please sign in to continue.'); return auth();};
  const clean=(v)=>v===undefined?null:v;
  async function q(promise){const r=await promise;if(r.error)throw r.error;return r.data;}
  const accounts={
    async me(){const id=requireAuth();return q(supabaseClient.from('accounts').select('id,role,full_name,email,phone,city,region,photo_url,bio,email_verified,phone_verified,verification_status,created_at,updated_at').eq('id',id).single());},
    async update(fields){const id=requireAuth();const allowed={full_name:fields.full_name,phone:fields.phone,city:fields.city,region:fields.region,photo_url:fields.photo_url,bio:fields.bio};return q(supabaseClient.from('accounts').update(Object.fromEntries(Object.entries(allowed).filter(([,v])=>v!==undefined))).eq('id',id).select().single());}
  };
  const freelancers={
    async public(){const [a,f,s,p]=await Promise.all([
      q(supabaseClient.from('public_accounts').select('id,role,full_name,city,region,photo_url,bio,verification_status,created_at').eq('role','freelancer')),
      q(supabaseClient.from('freelancer_profiles').select('*')),
      q(supabaseClient.from('services').select('*').eq('published',true)),
      q(supabaseClient.from('portfolios').select('*'))
    ]);return {accounts:a,profiles:f,services:s,portfolios:p};},
    async profile(){const id=requireAuth();return q(supabaseClient.from('freelancer_profiles').select('*').eq('account_id',id).single());},
    async updateProfile(fields){const id=requireAuth();return q(supabaseClient.from('freelancer_profiles').update(fields).eq('account_id',id).select().single());}
  };
  const onboarding={
    async freelancer(payload){
      const id=requireAuth();
      const invoke=await supabaseClient.functions.invoke('hunar-freelancer-onboarding',{body:{payload}});
      if(!invoke.error && !invoke.data?.error)return invoke.data?.data||invoke.data;
      let message=invoke.error?.message||invoke.data?.error||'Freelancer onboarding could not be completed.';
      try{if(invoke.error?.context&&typeof invoke.error.context.clone==='function'){const body=await invoke.error.context.clone().json();if(body&&body.error)message=body.details?`${body.error} ${body.details}`:body.error}}catch(parseError){console.error('HUNAR onboarding error response could not be parsed:',parseError)}
      const verificationConstraint=/verification_requests.*legal_name|legal_name.*not-null|null value in column ['\"]legal_name['\"]?/i.test(String(message));
      if(verificationConstraint){
        // The legacy Edge Function may still require verification_requests during signup.
        // Registration must NOT create an identity-verification request. Complete the
        // normal freelancer profile/service/portfolio directly instead of depending on
        // a possibly-missing RPC in the database schema cache.
        console.warn('HUNAR legacy onboarding requested registration identity verification; using direct registration-safe completion.');
        const uid=id;
        const profilePayload={
          account_id:uid,
          professional_title:clean(payload.professional_title),
          profession:clean(payload.profession),
          experience:clean(payload.experience),
          availability:clean(payload.availability),
          starting_price_etb:Number(payload.starting_price_etb||0),
          languages:Array.isArray(payload.languages)?payload.languages:[],
          categories:Array.isArray(payload.categories)?payload.categories:[],
          skills:Array.isArray(payload.skills)?payload.skills:[],
          certificates:Array.isArray(payload.certificates)?payload.certificates:[]
        };
        const profile=await q(supabaseClient.from('freelancer_profiles').upsert(profilePayload,{onConflict:'account_id'}).select().single());
        let service=null;
        // Service/portfolio records are optional during registration. Some existing
        // HUNAR databases have older service schemas/RLS policies; those must never
        // prevent a verified freelancer from entering the dashboard.
        try{
          if(payload.service_title){
            service=await q(supabaseClient.from('services').insert({
              freelancer_id:uid,
              title:clean(payload.service_title),
              category:clean(payload.service_category),
              description:clean(payload.service_description),
              price_etb:Number(payload.service_price_etb||0),
              delivery_days:Number(payload.service_delivery_days||7),
              revisions:Number(payload.service_revisions||0),
              includes:Array.isArray(payload.service_includes)?payload.service_includes:[],
              skills:Array.isArray(payload.skills)?payload.skills:[],
              image_url:clean(payload.service_image_url)
            }).select().single());
          }
        }catch(serviceError){
          console.warn('HUNAR registration service save skipped; dashboard access is not blocked:',serviceError);
        }
        let portfolio=null;
        try{
          if(payload.portfolio_title){
            portfolio=await q(supabaseClient.from('portfolios').insert({
              freelancer_id:uid,
              title:clean(payload.portfolio_title),
              description:clean(payload.portfolio_description),
              category:clean(payload.portfolio_category),
              tools:Array.isArray(payload.portfolio_tools)?payload.portfolio_tools:[],
              role:clean(payload.portfolio_role),
              year:Number(payload.portfolio_year||new Date().getFullYear()),
              live_url:clean(payload.portfolio_url),
              image_url:clean(payload.portfolio_image_url)
            }).select().single());
          }
        }catch(portfolioError){
          console.warn('HUNAR registration portfolio save skipped; dashboard access is not blocked:',portfolioError);
        }
        return {ok:true,profile,service,portfolio,identity_verification:'available_later_from_dashboard'};
      }
      throw new Error(message);
    }
  };
  const verification={
    async mine(){const id=requireAuth();return q(supabaseClient.from('verification_requests').select('id,account_id,legal_name,id_type,status,review_reason,created_at,reviewed_at').eq('account_id',id).order('created_at',{ascending:false}));},
    async submit(payload){const id=requireAuth();if(!payload?.legalName||!payload?.idType)throw new Error('Legal name and ID type are required.');const existing=await q(supabaseClient.from('verification_requests').select('id,status').eq('account_id',id).in('status',['pending','approved']).order('created_at',{ascending:false}).limit(1));if(existing?.[0]?.status==='approved')throw new Error('Your identity is already verified.');if(existing?.[0]?.status==='pending')throw new Error('Your identity verification is already under review.');const idReference=(String(payload?.idReference||'').trim()||`HUNAR-VER-${crypto.randomUUID()}`);return q(supabaseClient.from('verification_requests').insert({account_id:id,id_reference:idReference,legal_name:String(payload.legalName).trim(),id_type:String(payload.idType).trim(),status:'pending'}).select('id,account_id,id_reference,legal_name,id_type,status,created_at').single());},
    async attachFiles(requestId,docFile,selfieFile,backFile){const id=requireAuth();if(!requestId)throw new Error('Verification request is missing.');const paths={};if(docFile){const path=`${id}/${requestId}/id-front-${Date.now()}-${docFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await this.upload('hunar-verification-documents',path,docFile);paths.id_front=path;}if(selfieFile){const path=`${id}/${requestId}/selfie-${Date.now()}-${selfieFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await this.upload('hunar-verification-documents',path,selfieFile);paths.selfie=path;}if(backFile){const path=`${id}/${requestId}/id-back-${Date.now()}-${backFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await this.upload('hunar-verification-documents',path,backFile);paths.id_back=path;}if(Object.keys(paths).length)await q(supabaseClient.from('verification_requests').update({review_reason:`[HUNAR_EKYC_FILES] ${JSON.stringify(paths)}`}).eq('id',requestId).eq('account_id',id));return paths;} ,
    async upload(bucket,path,file){requireAuth();if(!file)throw new Error('File is required.');if(file.size>10*1024*1024)throw new Error('Verification files must be 10 MB or smaller.');const allowed=['image/jpeg','image/png','application/pdf'];if(!allowed.includes(file.type))throw new Error('Use JPG, PNG, or PDF files for identity verification.');return q(supabaseClient.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type}));}
  };
  const services={
    async mine(){const id=requireAuth();return q(supabaseClient.from('services').select('*').eq('freelancer_id',id).order('created_at',{ascending:false}));},
    async create(data){const id=requireAuth();return q(supabaseClient.from('services').insert({...data,freelancer_id:id}).select().single());},
    async update(id,data){const uid=requireAuth();return q(supabaseClient.from('services').update(data).eq('id',id).eq('freelancer_id',uid).select().single());},
    async remove(id){const uid=requireAuth();return q(supabaseClient.from('services').delete().eq('id',id).eq('freelancer_id',uid));}
  };
  const portfolios={
    async mine(){const id=requireAuth();return q(supabaseClient.from('portfolios').select('*').eq('freelancer_id',id).order('created_at',{ascending:false}));},
    async create(data){const id=requireAuth();return q(supabaseClient.from('portfolios').insert({...data,freelancer_id:id}).select().single());},
    async update(id,data){const uid=requireAuth();return q(supabaseClient.from('portfolios').update(data).eq('id',id).eq('freelancer_id',uid).select().single());},
    async remove(id){const uid=requireAuth();return q(supabaseClient.from('portfolios').delete().eq('id',id).eq('freelancer_id',uid));}
  };
  const projects={
    async list(){return q(supabaseClient.from('projects').select('*').order('created_at',{ascending:false}));},
    async mine(){const id=requireAuth();return q(supabaseClient.from('projects').select('*').eq('client_id',id).order('created_at',{ascending:false}));},
    async create(data){const id=requireAuth();return q(supabaseClient.from('projects').insert({...data,client_id:id,status:data.status||'posted'}).select().single());},
    async update(id,data){const uid=requireAuth();return q(supabaseClient.from('projects').update(data).eq('id',id).eq('client_id',uid).select().single());},
    async get(id){return q(supabaseClient.from('projects').select('*').eq('id',id).single());}
  };
  const applications={
    async mine(){const id=requireAuth();return q(supabaseClient.from('applications').select('*').eq('freelancer_id',id).order('created_at',{ascending:false}));},
    async forProject(projectId){requireAuth();return q(supabaseClient.from('applications').select('*').eq('project_id',projectId).order('created_at',{ascending:false}));},
    async forClient(){const id=requireAuth();const projects=await q(supabaseClient.from('projects').select('id').eq('client_id',id));const ids=(projects||[]).map(x=>x.id).filter(Boolean);if(!ids.length)return [];return q(supabaseClient.from('applications').select('*').in('project_id',ids).order('created_at',{ascending:false}));},
    async create(data,portfolioIds=[]){const id=requireAuth();
      const project=await q(supabaseClient.from('projects').select('id,status').eq('id',data.project_id).single());
      if(!['posted','application'].includes(project.status)) throw new Error('This project is no longer accepting applications.');
      if(portfolioIds.length){const owned=await q(supabaseClient.from('portfolios').select('id').eq('freelancer_id',id).in('id',portfolioIds));if(owned.length!==portfolioIds.length)throw new Error('One or more selected portfolio items do not belong to you.');}
      const app=await q(supabaseClient.from('applications').insert({...data,freelancer_id:id,portfolio_ids:portfolioIds,status:'submitted'}).select().single());
      if(portfolioIds.length) await q(supabaseClient.from('application_portfolios').insert(portfolioIds.map(portfolio_id=>({application_id:app.id,portfolio_id}))));
      return app;
    }
  };
  async function hireFreelancer(applicationId){const id=requireAuth();if(!applicationId)throw new Error('Application is required.');const r=await supabaseClient.rpc('hunar_hire_freelancer',{p_application_id:applicationId});if(r.error)throw r.error;return r.data;}
  const saved={
    async list(){const id=requireAuth();return q(supabaseClient.from('saved_freelancers').select('freelancer_id,created_at').eq('client_id',id).order('created_at',{ascending:false}));},
    async toggle(freelancerId){const id=requireAuth();if(!isUuid(freelancerId))throw new Error('Choose a registered freelancer profile.');const r=await supabaseClient.rpc('hunar_toggle_saved_freelancer',{p_freelancer_id:freelancerId});if(r.error)throw r.error;return !!r.data;}
  };
  const messaging={
    async newConversation(otherId,projectId=null){
      const id=requireAuth();
      if(!otherId||otherId===id)throw new Error('Choose another Hunar member to message.');
      const c=await q(supabaseClient.from('conversations').insert({created_by:id,project_id:clean(projectId)}).select('id,project_id,created_by').single());
      await q(supabaseClient.from('conversation_members').insert([
        {conversation_id:c.id,account_id:id},
        {conversation_id:c.id,account_id:otherId}
      ]));
      return c;
    },
    async conversationWith(otherId,projectId=null){const id=requireAuth();if(!otherId||otherId===id)throw new Error('Choose another Hunar member to message.');const wanted=String(otherId);const mine=await q(supabaseClient.from('conversation_members').select('conversation_id').eq('account_id',id));const mineIds=(mine||[]).map(x=>x.conversation_id).filter(Boolean);if(mineIds.length){const shared=await q(supabaseClient.from('conversation_members').select('conversation_id,account_id').in('conversation_id',mineIds));const byConv=new Map();for(const row of (shared||[])){const key=String(row.conversation_id);if(!byConv.has(key))byConv.set(key,new Set());byConv.get(key).add(String(row.account_id));}const candidates=[...byConv.entries()].filter(([,members])=>members.has(wanted)).map(([cid])=>cid);if(candidates.length){let cq=supabaseClient.from('conversations').select('id,project_id,created_by').in('id',candidates);if(projectId)cq=cq.eq('project_id',projectId);else cq=cq.is('project_id',null);const existing=await q(cq.order('created_at',{ascending:false}).limit(1).maybeSingle());if(existing)return existing;}}let query=supabaseClient.from('conversations').select('id,project_id,created_by').eq('created_by',id);if(projectId)query=query.eq('project_id',projectId);else query=query.is('project_id',null);query=query.limit(1);let c=await q(query.maybeSingle());if(c){const members=await q(supabaseClient.from('conversation_members').select('account_id').eq('conversation_id',c.id));if((members||[]).some(x=>String(x.account_id)===wanted))return c;}c=await q(supabaseClient.from('conversations').insert({created_by:id,project_id:clean(projectId)}).select('id,project_id,created_by').single());await q(supabaseClient.from('conversation_members').insert([{conversation_id:c.id,account_id:id},{conversation_id:c.id,account_id:otherId}]));return c;},
    async send(otherId,body,projectId=null,conversationId=null){
      const id=requireAuth();
      const text=String(body||'').trim();
      if(conversationId&&supabaseClient.rpc){
        const exact=await supabaseClient.rpc('hunar_send_message_to_conversation',{p_conversation_id:conversationId,p_body:text});
        if(!exact.error)return exact.data;
        if(!/could not find the function|schema cache|does not exist|not found/i.test(String(exact.error?.message||'')))throw exact.error;
      }
      if(!text)throw new Error('Message cannot be empty.');
      if(!otherId||otherId===id)throw new Error('Choose another HUNAR member to message.');

      // Primary path: use the secure database RPC when PostgREST has it available.
      if(supabaseClient.rpc){
        const rpc=await supabaseClient.rpc('hunar_send_message',{p_recipient_id:otherId,p_body:text,p_project_id:clean(projectId)});
        if(!rpc.error)return rpc.data;
        if(rpc.error?.code==='PGRST202' || /could not find the function|schema cache|400|notification|not-null|violates not-null/i.test(String(rpc.error?.message||''))) {
          console.warn('HUNAR message RPC is not visible in PostgREST; using direct path.',rpc.error);
        } else {
          throw new Error(String(rpc.error?.message||'HUNAR could not save this message.'));
        }

        // Some Supabase projects keep an older PostgREST schema cache after a migration.
        // Fall through to the same membership/RLS-protected tables used by the rest
        // of this service when the RPC is unavailable from the API schema.
        const msg=String(rpc.error?.message||'');
        if(!/could not find the function|schema cache|does not exist|not found/i.test(msg))throw rpc.error;
        console.warn('HUNAR hunar_send_message RPC unavailable; using direct RLS-safe message path.',rpc.error);
      }

      // Fallback path: find an existing shared conversation, otherwise create one.
      // This makes message sending work even while PostgREST is refreshing its RPC schema.
      let fallbackConversationId=null;
      const mine=await q(supabaseClient.from('conversation_members').select('conversation_id').eq('account_id',id));
      const mineIds=(mine||[]).map(x=>x.conversation_id).filter(Boolean);
      if(mineIds.length){
        const shared=await q(supabaseClient.from('conversation_members').select('conversation_id,account_id').in('conversation_id',mineIds));
        const byConv=new Map();
        for(const row of (shared||[])){
          const key=String(row.conversation_id);
          if(!byConv.has(key))byConv.set(key,new Set());
          byConv.get(key).add(String(row.account_id));
        }
        const wanted=String(otherId);
        for(const [cid,members] of byConv){
          if(members.has(String(id))&&members.has(wanted)){fallbackConversationId=cid;break;}
        }
      }

      if(!fallbackConversationId){
        const c=await q(supabaseClient.from('conversations').insert({created_by:id,project_id:clean(projectId)}).select('id').single());
        fallbackConversationId=c.id;
        await q(supabaseClient.from('conversation_members').insert([
          {conversation_id:fallbackConversationId,account_id:id},
          {conversation_id:fallbackConversationId,account_id:otherId}
        ]));
      }

      return q(supabaseClient.from('messages').insert({conversation_id:fallbackConversationId,sender_id:id,body:text}).select().single());
    },
    async attachVoice(message,blob){const id=requireAuth();if(!message?.id||!blob)throw new Error('Voice message is not ready to send.');const conversationId=String(message.conversation_id||'').trim();if(!conversationId)throw new Error('Voice message conversation is missing.');const mime=String(blob.type||'audio/webm').split(';')[0].toLowerCase();const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':mime.includes('mpeg')?'mp3':mime.includes('wav')?'wav':'webm';const path=id+'/'+message.id+'-'+Date.now()+'.'+ext;const upload=await supabaseClient.storage.from('hunar-message-media').upload(path,blob,{upsert:false,contentType:blob.type||'audio/webm'});if(upload.error)throw upload.error;const row=await q(supabaseClient.from('message_attachments').insert({message_id:message.id,sender_id:id,kind:'voice',storage_path:path,mime_type:blob.type||'audio/webm',file_name:'voice-message.'+ext,file_size:blob.size}).select().single());await q(supabaseClient.from('messages').update({body:'[HUNAR_VOICE] '+path}).eq('id',message.id).eq('sender_id',id));return row;},
    async voiceUrl(path){requireAuth();if(!path)throw new Error('Voice file path is missing.');const buckets=['hunar-message-media','hunar-message-audio','hunar-voice-messages'];let last=null;for(const bucket of buckets){const r=await supabaseClient.storage.from(bucket).createSignedUrl(path,3600);if(!r.error&&r.data?.signedUrl)return r.data.signedUrl;last=r.error;}throw last||new Error('Voice message could not be opened.');},
    async list(){const id=requireAuth();
      // Prefer the dedicated membership-scoped RPC. It explicitly returns only
      // conversations where auth.uid() is a member, so a client->freelancer message
      // cannot be visible only to the sender/notification trigger.
      try{
        const rpc=await supabaseClient.rpc('hunar_list_my_messages');
        if(!rpc.error&&Array.isArray(rpc.data))return rpc.data.map(x=>({...x,sender_id:String(x.sender_id),recipient_id:x.recipient_id?String(x.recipient_id):null,project_id:x.project_id||null}));
      }catch(e){}
      const rows=await q(supabaseClient.from('messages').select('id,conversation_id,sender_id,body,created_at,edited_at,deleted_at').order('created_at',{ascending:true}));const ids=[...new Set((rows||[]).map(x=>x.conversation_id).filter(Boolean))];if(!ids.length)return [];const members=await q(supabaseClient.from('conversation_members').select('conversation_id,account_id').in('conversation_id',ids));const convIds=[...new Set((members||[]).map(x=>x.conversation_id).filter(Boolean))];let conversations=[];if(convIds.length){conversations=await q(supabaseClient.from('conversations').select('id,project_id').in('id',convIds));}const projectByConv=new Map((conversations||[]).map(x=>[String(x.id),x.project_id||null]));const otherByConv=new Map();for(const m of (members||[])){const key=String(m.conversation_id);if(String(m.account_id)!==String(id)&&!otherByConv.has(key))otherByConv.set(key,String(m.account_id));}return (rows||[]).map(x=>({...x,sender_id:String(x.sender_id),recipient_id:otherByConv.get(String(x.conversation_id))||null,project_id:projectByConv.get(String(x.conversation_id))||null}));}
  };
  const notifications={
    async list(){const id=requireAuth();return q(supabaseClient.from('notifications').select('*').eq('account_id',id).order('created_at',{ascending:false}));},
    async markRead(id){const uid=requireAuth();return q(supabaseClient.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('account_id',uid));}
  };
  const reviews={
    async forUser(id){return q(supabaseClient.from('reviews').select('*').eq('reviewee_id',id).order('created_at',{ascending:false}));},
    async create(data){const id=requireAuth();return q(supabaseClient.from('reviews').insert({...data,reviewer_id:id}).select().single());},
    async respond(reviewId,body){const id=requireAuth();return q(supabaseClient.from('review_responses').insert({review_id:reviewId,responder_id:id,body}).select().single());}
  };
  const workspace={
    async load(projectId){requireAuth();const [p,m,a,f]=await Promise.all([projects.get(projectId),q(supabaseClient.from('milestones').select('*').eq('project_id',projectId).order('sort_order')),q(supabaseClient.from('project_activity').select('*').eq('project_id',projectId).order('created_at',{ascending:true})),q(supabaseClient.from('project_files').select('*').eq('project_id',projectId).order('created_at',{ascending:false}))]);return {project:p,milestones:m,activity:a,files:f};},
    async addMilestone(projectId,data){return q(supabaseClient.from('milestones').insert({...data,project_id:projectId}).select().single());},
    async activity(projectId,action,metadata={}){const id=requireAuth();return q(supabaseClient.from('project_activity').insert({project_id:projectId,actor_id:id,action,metadata}).select().single());}
  };
  async function compressSupportedImage(file,bucket){
    // Only compress supported JPEG/WebP images in visual buckets, and only when
    // they are large enough to benefit. PNGs, PDFs, ZIPs, project files, and
    // identity documents are intentionally left unchanged.
    if(!file||!['hunar-avatars','hunar-portfolios'].includes(bucket))return file;
    if(!['image/jpeg','image/webp'].includes(String(file.type||'').toLowerCase()))return file;
    if(file.size<=1.5*1024*1024)return file;
    if(typeof createImageBitmap!=='function'||typeof document==='undefined')return file;
    try{
      const bitmap=await createImageBitmap(file);
      const maxSide=2200;
      const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d',{alpha:true});
      if(!ctx){bitmap.close?.();return file;}
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      bitmap.close?.();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,file.type==='image/webp'?'image/webp':'image/jpeg',.82));
      if(!blob||blob.size>=file.size)return file;
      return new File([blob],file.name,{type:file.type,lastModified:Date.now()});
    }catch(_e){return file;}
  }
  const storage={
    async upload(bucket,path,file){requireAuth();if(!file)throw new Error('File is required.');const max=bucket==='hunar-verification-documents'?10*1024*1024:bucket==='hunar-project-files'?50*1024*1024:bucket==='hunar-portfolios'?10*1024*1024:5*1024*1024;if(file.size>max)throw new Error('File is too large for this Hunar upload.');const allowed={ 'hunar-avatars':['image/jpeg','image/png','image/webp'], 'hunar-portfolios':['image/jpeg','image/png','image/webp','application/pdf'], 'hunar-project-files':['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/zip'], 'hunar-verification-documents':['image/jpeg','image/png','application/pdf']};if(!allowed[bucket]?.includes(file.type))throw new Error('This file type is not allowed.');const uploadFile=await compressSupportedImage(file,bucket);const r=await q(supabaseClient.storage.from(bucket).upload(path,uploadFile,{upsert:false,contentType:uploadFile.type}));return {...r,publicUrl:(bucket==='hunar-avatars'||bucket==='hunar-portfolios')?supabaseClient.storage.from(bucket).getPublicUrl(r.path).data.publicUrl:null};}
  };
  const contracts={
    async list(){requireAuth();const r=await supabaseClient.rpc('hunar_list_my_contracts');if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];},
    async create(applicationId,title,description,total,milestones=[]){requireAuth();const r=await supabaseClient.rpc('hunar_create_contract',{p_application_id:applicationId,p_title:title,p_description:description||null,p_total_amount_etb:Number(total),p_milestones:Array.isArray(milestones)?milestones:[]});if(r.error)throw r.error;return r.data;},
    async createDirect(freelancerId,title,description,total,milestones=[]){requireAuth();const r=await supabaseClient.rpc('hunar_create_direct_contract',{p_freelancer_id:freelancerId,p_title:title,p_description:description||null,p_total_amount_etb:Number(total),p_milestones:Array.isArray(milestones)?milestones:[]});if(r.error)throw r.error;return r.data;},
    async accept(id){requireAuth();const r=await supabaseClient.rpc('hunar_accept_contract',{p_contract_id:id});if(r.error)throw r.error;return true;},
    async fundContract(contractId){requireAuth();const r=await supabaseClient.functions.invoke('hunar-chapa-payments',{body:{action:'initialize_contract_payment',contract_id:contractId}});if(r.error){let msg=r.error.message||'Payment could not be started.';try{if(r.error.context?.clone){const body=await r.error.context.clone().json();if(body?.message)msg=body.message}}catch(_e){}throw new Error(msg)}if(r.data?.code==='CHAPA_NOT_CONFIGURED')throw new Error(r.data.message||'Chapa is not configured yet.');if(!r.data?.ok)throw new Error(r.data?.message||'Payment could not be started.');if(r.data.checkout_url)window.location.href=r.data.checkout_url;return r.data;}
  };
  const wallet={
    async summary(){const id=requireAuth();const r=await supabaseClient.rpc('hunar_wallet_summary',{p_user_id:id});if(r.error)throw r.error;return Array.isArray(r.data)?(r.data[0]||{}):(r.data||{});},
    async transactions(limit=100,offset=0){requireAuth();const r=await supabaseClient.rpc('hunar_list_wallet_transactions',{p_limit:limit,p_offset:offset});if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];},
    async clientPayments(limit=100,offset=0){requireAuth();const r=await supabaseClient.rpc('hunar_list_my_client_payments',{p_limit:limit,p_offset:offset});if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[]},
    async withdrawals(limit=50,offset=0){requireAuth();const r=await supabaseClient.rpc('hunar_list_my_withdrawals',{p_limit:limit,p_offset:offset});if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];},
    async verifyContractPayment(contractId){requireAuth();const r=await supabaseClient.functions.invoke('hunar-chapa-payments',{body:{action:'verify_contract_payment',contract_id:contractId}});if(r.error){let msg=r.error.message||'Payment verification is unavailable.';try{if(r.error.context?.clone){const body=await r.error.context.clone().json();if(body?.message)msg=body.message}}catch(_e){}throw new Error(msg)}if(!r.data?.ok)throw new Error(r.data?.message||'Chapa has not verified this payment yet.');return r.data;},
    async requestWithdrawal(data){requireAuth();const r=await supabaseClient.functions.invoke('hunar-chapa-payments',{body:{action:'request_withdrawal',...data}});if(r.error){let msg=r.error.message||'Withdrawal could not be requested.';try{if(r.error.context?.clone){const body=await r.error.context.clone().json();if(body?.message)msg=body.message}}catch(_e){}throw new Error(msg)}if(!r.data?.ok)throw new Error(r.data?.provider_message?('Chapa rejected the payout: '+r.data.provider_message):(r.data?.message||'Withdrawal could not be requested.'));return r.data;}
  };
  window.HunarData={accounts,onboarding,verification,freelancers,services,portfolios,projects,applications,saved,messaging,notifications,reviews,workspace,storage,hireFreelancer,contracts,wallet};
})();
