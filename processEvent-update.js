// processEvent function update for text field support
// This is a code snippet to replace the existing processEvent function

function processEvent(eventType: string, eventData: string) {
  console.log('processEvent called with type:', eventType, 'data:', eventData);
  try {
    // JSONでない場合は単純なテキストとして処理
    let parsedData;
    try {
      parsedData = JSON.parse(eventData);
    } catch (e) {
      // JSONではない場合、シンプルなトークンとして扱う
      parsedData = { content: eventData };
      // イベントタイプがない場合はトークンとして扱う
      if (!eventType) eventType = 'token';
    }
    
    switch (eventType) {
      case 'start':
        console.log('Processing start event:', parsedData);
        callbacks.onStart?.(parsedData);
        break;
      case 'token':
        // content, text, または文字列化されたデータを取得
        const tokenContent = parsedData.content || parsedData.text || (typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData));
        console.log('Processing token event with content:', tokenContent);
        console.log('Parsed data structure:', parsedData);
        callbacks.onToken?.(tokenContent);
        break;
      case 'end':
        console.log('Processing end event:', parsedData);
        callbacks.onEnd?.(parsedData);
        break;
      case 'error':
        callbacks.onError?.(parsedData.error || 'Unknown streaming error');
        controller.abort();
        break;
      default:
        // 不明なイベントタイプの場合、内容によって処理
        const defaultContent = parsedData.content || parsedData.text || (typeof parsedData === 'string' ? parsedData : '');
        if (defaultContent) {
          console.log('Default processing with content:', defaultContent);
          callbacks.onToken?.(defaultContent);
        }
        break;
    }
  } catch (error) {
    console.error(`Error processing streaming data:`, error);
    console.error(`Event type: ${eventType}, Raw data: ${eventData}`);
  }
}
