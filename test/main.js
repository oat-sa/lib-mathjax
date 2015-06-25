requirejs.config({
    baseUrl : '../dist',
    config : {
        'MathJax/MathJax' : {
            root : '../dist/'       //where MathJax will look for it's fonts
        },
    }
});

require(['MathJax.min'], function(M){
        //M.Hub.Config({ root : '../dist/' });
        //M.Hub.Configured();
});
